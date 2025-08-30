/**
 * Scout Appwrite Function
 * 
 * This function automatically scouts tech websites for high-quality articles,
 * analyzes them using AI, and adds the best ones to your refetch database.
 */

import { Client, Databases, ID, Query } from 'node-appwrite';
import OpenAI from 'openai';
import axios from 'axios';
import { JSDOM } from 'jsdom';

// Target websites to scout
function getTargetWebsites() {
  // Get from environment variable
  const envWebsites = process.env.TARGET_WEBSITES;
  
  if (!envWebsites) {
    throw new Error('TARGET_WEBSITES environment variable is required. Please set it with a comma-separated list of URLs.');
  }
  
  try {
    // Parse comma-separated URLs
    const websites = envWebsites
      .split(',')
      .map(url => url.trim())
      .filter(url => url.length > 0);
    
    if (websites.length === 0) {
      throw new Error('TARGET_WEBSITES environment variable contains no valid URLs');
    }
    
    console.log(`📋 Using ${websites.length} target websites from TARGET_WEBSITES environment variable`);
    return websites;
    
  } catch (parseError) {
    throw new Error(`Failed to parse TARGET_WEBSITES environment variable: ${parseError.message}. Expected format: "url1,url2,url3"`);
  }
}

// System prompt for AI content analysis
const SYSTEM_PROMPT = `You are an expert content analyst for a tech news platform called "refetch" (similar to Hacker News but an open source alternative). 

IMPORTANT: You must respond with ONLY valid JSON. Do not include any text before or after the JSON response.

Analyze the provided list of URLs and their link text labels, and return a JSON response with the following structure:

{
  "articles": [
    {
      "url": "https://example.com/article-url",
      "refetchTitle": "A clear, informative title that feels like refetch style - very attractive, and engaging without being clickbait.",
      "discussionStarter": "An engaging comment (2-3 sentences) that will kick off a good discussion. Should highlight the key points, ask a thought-provoking question, or share an interesting perspective that will get developers talking."
    }
  ]
}

CRITICAL GUIDELINES:
- Respond with ONLY the JSON object, no additional text
- Only include URLs that are actually articles (not about pages, contact forms, etc.)
- "refetchTitle" should be clear, informative, and developer-focused
- "discussionStarter" should be engaging and conversation-starting
- Focus on content that would be valuable to developers, open source enthusiasts, and tech professionals
- Look for articles with substantial content potential, not just headlines or minimal text
- If you cannot analyze the content properly, return an empty articles array
- The discussionStarter should be the kind of comment that would start a good conversation on HN or refetch
- Skip URLs that are clearly not articles (about, contact, privacy, terms, etc.)`;

// Initialize clients
let appwriteClient, databases, openai;

// Helper function to initialize clients
function initializeClients() {
  if (!appwriteClient) {
    // In Appwrite Functions, these environment variables are automatically available
    const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = process.env.APPWRITE_PROJECT_ID || '';
    const apiKey = process.env.APPWRITE_API_KEY || '';
    
    console.log('Appwrite Client Configuration:');
    console.log(`- Endpoint: ${endpoint}`);
    console.log(`- Project ID: ${projectId ? `${projectId.substring(0, 8)}...` : 'NOT SET'}`);
    console.log(`- API Key: ${apiKey ? `${apiKey.substring(0, 8)}... (length: ${apiKey.length})` : 'NOT SET'}`);
    
    appwriteClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);
    
    databases = new Databases(appwriteClient);
  }
  
  if (!openai) {
    const openaiKey = process.env.OPENAI_API_KEY || '';
    console.log(`OpenAI API Key: ${openaiKey ? `${openaiKey.substring(0, 8)}... (length: ${openaiKey.length})` : 'NOT SET'}`);
    
    openai = new OpenAI({
      apiKey: openaiKey,
    });
  }
}

// Helper function to clean URLs
function cleanUrl(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  } catch (error) {
    return url;
  }
}

// Fallback function to extract URLs using regex when JSDOM fails
function extractUrlsWithRegex(html, baseUrl) {
  try {
    const articleData = [];
    const urlRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
    let match;
    
    while ((match = urlRegex.exec(html)) !== null) {
      const url = match[1];
      const label = match[2].trim();
      
      if (!url || url === '#' || url === 'javascript:void(0)') continue;
      
      let fullUrl = url;
      if (url.startsWith('/')) {
        fullUrl = new URL(url, baseUrl).href;
      } else if (!url.startsWith('http')) {
        continue;
      }

      const urlPath = new URL(fullUrl).pathname;
      if (urlPath.length < 10) continue;
      
      const slashCount = (urlPath.match(/\//g) || []).length;
      if (slashCount < 2) continue;
      
      const articlePatterns = [
        /\d{4}\/\d{2}\/\d{2}/i,
        /\d{4}\/\d{2}/i,
        /article/i,
        /story/i,
        /news/i,
        /post/i,
        /blog/i,
        /entry/i,
        /item/i
      ];
      
      if (!articlePatterns.some(pattern => pattern.test(fullUrl))) continue;
      
      if (label && label.length > 5 && label.length < 200) {
        articleData.push({
          url: fullUrl,
          label: label,
          source: baseUrl
        });
      }
    }
    
    const uniqueArticles = [];
    const seenUrls = new Set();
    
    for (const article of articleData) {
      if (!seenUrls.has(article.url)) {
        seenUrls.add(article.url);
        uniqueArticles.push(article);
      }
    }
    
    const finalArticles = uniqueArticles.slice(0, 100);
    return finalArticles;
    
  } catch (fallbackError) {
    console.error(`  Fallback extraction failed: ${fallbackError.message}`);
    return [];
  }
}

// Helper function to scrape a website's main page and extract article links with labels
// This function is designed to avoid loading any external resources (iframes, CSS, scripts, images)
// by using restrictive headers and post-processing HTML to remove external references
async function scrapeWebsiteForArticles(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        // Prevent loading of external resources
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        // Explicitly reject iframes, CSS, JS, and other media
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 30000,
      // Prevent axios from following redirects to external resources
      maxRedirects: 2,
      // Only accept HTML responses
      validateStatus: function (status) {
        return status >= 200 && status < 300;
      }
    });
    
    if (response.status === 200) {
      let html = response.data;
      
      // Debug: Check HTML before cleaning
      const beforeAnchorCount = (html.match(/<a[^>]*href=/gi) || []).length;
      const beforeSampleAnchors = html.match(/<a[^>]*href=["'][^"']*["'][^>]*>[^<]*<\/a>/gi)?.slice(0, 3) || [];
      
      // Debug: Check for empty href attributes in raw HTML
      const emptyHrefMatches = html.match(/<a[^>]*href=["']{2}[^>]*>/gi) || [];
      if (emptyHrefMatches.length > 0) {
        console.log(`  ⚠️ Found ${emptyHrefMatches.length} anchor tags with empty href in raw HTML`);
        console.log(`  📍 Sample empty href: ${emptyHrefMatches[0]}`);
      }
      
      // Debug: Check for different anchor tag patterns
      const anchorPatterns = {
        noHref: (html.match(/<a[^>]*>(?!.*href)/gi) || []).length,
        emptyHref: (html.match(/<a[^>]*href=["']{2}[^>]*>/gi) || []).length,
        hashHref: (html.match(/<a[^>]*href=["']#[^"']*["'][^>]*>/gi) || []).length,
        javascriptHref: (html.match(/<a[^>]*href=["']javascript:[^"']*["'][^>]*>/gi) || []).length,
        relativeHref: (html.match(/<a[^>]*href=["']\/[^"']*["'][^>]*>/gi) || []).length,
        absoluteHref: (html.match(/<a[^>]*href=["']https?:\/\/[^"']*["'][^>]*>/gi) || []).length,
        otherHref: (html.match(/<a[^>]*href=["'][^"']*["'][^>]*>/gi) || []).length
      };
      
      console.log(`  📊 Raw HTML anchor patterns: noHref=${anchorPatterns.noHref}, emptyHref=${anchorPatterns.emptyHref}, hashHref=${anchorPatterns.hashHref}, jsHref=${anchorPatterns.javascriptHref}, relativeHref=${anchorPatterns.relativeHref}, absoluteHref=${anchorPatterns.absoluteHref}, otherHref=${anchorPatterns.otherHref}`);
      
      // Debug: Show a few raw anchor tags to understand the structure
      const rawAnchors = html.match(/<a[^>]*>[^<]*<\/a>/gi)?.slice(0, 5) || [];
      if (rawAnchors.length > 0) {
        console.log(`  🔍 Raw anchor tags (first 5):`);
        rawAnchors.forEach((anchor, i) => {
          console.log(`    ${i + 1}. ${anchor}`);
        });
      }
      
      // Debug: Check for alternative link patterns (buttons, divs with onclick, etc.)
      const alternativePatterns = {
        buttons: (html.match(/<button[^>]*onclick[^>]*>/gi) || []).length,
        divsWithOnclick: (html.match(/<div[^>]*onclick[^>]*>/gi) || []).length,
        spansWithOnclick: (html.match(/<span[^>]*onclick[^>]*>/gi) || []).length,
        dataAttributes: (html.match(/<[^>]*data-[^=]*=[^>]*>/gi) || []).length,
        ariaButtons: (html.match(/<[^>]*role=["']button["'][^>]*>/gi) || []).length,
        tabIndexElements: (html.match(/<[^>]*tabindex[^>]*>/gi) || []).length,
        dataUrlAttributes: (html.match(/<[^>]*data-url[^>]*>/gi) || []).length,
        dataHrefAttributes: (html.match(/<[^>]*data-href[^>]*>/gi) || []).length
      };
      
      console.log(`  📊 Alternative link patterns: buttons=${alternativePatterns.buttons}, divsWithOnclick=${alternativePatterns.divsWithOnclick}, spansWithOnclick=${alternativePatterns.spansWithOnclick}, dataAttributes=${alternativePatterns.dataAttributes}, ariaButtons=${alternativePatterns.ariaButtons}, tabIndexElements=${alternativePatterns.tabIndexElements}, dataUrlAttributes=${alternativePatterns.dataUrlAttributes}, dataHrefAttributes=${alternativePatterns.dataHrefAttributes}`);
      
      // Debug: Check HTML encoding and hidden characters
      const htmlLength = html.length;
      const nonAsciiChars = html.match(/[^\x00-\x7F]/g)?.length || 0;
      const hiddenChars = html.match(/[\u200B-\u200D\uFEFF]/g)?.length || 0;
      
      console.log(`  📊 HTML stats: length=${htmlLength}, nonAscii=${nonAsciiChars}, hiddenChars=${hiddenChars}`);
      
      // Debug: Check for JavaScript that sets href attributes
      const jsHrefPatterns = {
        setAttribute: (html.match(/setAttribute\(["']href["'][^)]*\)/gi) || []).length,
        hrefAssignment: (html.match(/\.href\s*=/gi) || []).length,
        innerHTML: (html.match(/innerHTML\s*=/gi) || []).length,
        outerHTML: (html.match(/outerHTML\s*=/gi) || []).length
      };
      
      console.log(`  📊 JavaScript href patterns: setAttribute=${jsHrefPatterns.setAttribute}, hrefAssignment=${jsHrefPatterns.hrefAssignment}, innerHTML=${jsHrefPatterns.innerHTML}, outerHTML=${jsHrefPatterns.outerHTML}`);
      
      // Post-process HTML to remove iframes, scripts, and external resources
      html = html
        // Remove iframe tags completely
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        // Remove script tags
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        // Remove style tags
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        // Remove link tags (CSS, favicons, etc.) - but preserve anchor tags
        .replace(/<link[^>]*>/gi, '')
        // Remove meta tags that might trigger external loads
        .replace(/<meta[^>]*http-equiv=["']refresh["'][^>]*>/gi, '')
        // Remove object and embed tags
        .replace(/<(object|embed)[^>]*>[\s\S]*?<\/(object|embed)>/gi, '')
        // Remove external resource references - but preserve anchor href attributes
        .replace(/src=["'](?!data:)[^"']*["']/gi, 'src=""')
        // Only remove href attributes from link tags (CSS, favicons), not from anchor tags
        .replace(/<link[^>]*href=["'](?!data:)[^"']*["'][^>]*>/gi, '<link>')
        // Remove any remaining external resource patterns
        .replace(/url\([^)]*\)/gi, 'url()');
      
      // Debug: Check HTML after cleaning
      const afterAnchorCount = (html.match(/<a[^>]*href=/gi) || []).length;
      const afterSampleAnchors = html.match(/<a[^>]*href=["'][^"']*["'][^>]*>[^<]*<\/a>/gi)?.slice(0, 3) || [];
      
      console.log(`  🔍 HTML cleaning debug: ${beforeAnchorCount} → ${afterAnchorCount} anchor tags with href`);
      if (beforeSampleAnchors.length > 0) {
        console.log(`  📍 Before cleaning sample: ${beforeSampleAnchors[0]}`);
      }
      if (afterSampleAnchors.length > 0) {
        console.log(`  📍 After cleaning sample: ${afterSampleAnchors[0]}`);
      }
      
      // Debug: Check for different href patterns
      const hrefPatterns = {
        empty: (html.match(/<a[^>]*href=["']{2}[^>]*>/gi) || []).length,
        hash: (html.match(/<a[^>]*href=["']#[^"']*["'][^>]*>/gi) || []).length,
        javascript: (html.match(/<a[^>]*href=["']javascript:[^"']*["'][^>]*>/gi) || []).length,
        relative: (html.match(/<a[^>]*href=["']\/[^"']*["'][^>]*>/gi) || []).length,
        absolute: (html.match(/<a[^>]*href=["']https?:\/\/[^"']*["'][^>]*>/gi) || []).length,
        other: (html.match(/<a[^>]*href=["'][^"']*["'][^>]*>/gi) || []).length
      };
      
      console.log(`  📊 Href patterns: empty=${hrefPatterns.empty}, hash=${hrefPatterns.hash}, js=${hrefPatterns.javascript}, relative=${hrefPatterns.relative}, absolute=${hrefPatterns.absolute}, other=${hrefPatterns.other}`);
      
      return html;
    } else {
      console.error(`❌ ${url}: HTTP ${response.status}`);
      return null;
    }
    
  } catch (error) {
    console.error(`❌ ${url}: ${error.message}`);
    return null;
  }
}

// Helper function to extract article URLs and labels from a website's main page
function extractArticleUrlsWithLabels(html, baseUrl) {
  try {
    const articleData = [];
    
    // Pre-process HTML to remove CSS content that causes parsing errors
    const cleanedHtml = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove <style> tags
      .replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '') // Remove stylesheet links
      .replace(/<!--[\s\S]*?-->/g, ''); // Remove HTML comments
    
    // Debug: Check if HTML cleaning is affecting anchor tags
    const originalAnchorCount = (html.match(/<a[^>]*href=/gi) || []).length;
    const cleanedAnchorCount = (cleanedHtml.match(/<a[^>]*href=/gi) || []).length;
    console.log(`  📊 HTML cleaning: ${originalAnchorCount} → ${cleanedAnchorCount} anchor tags with href`);
    
    // Try to create JSDOM with all external resources completely disabled
    let dom;
    try {
      dom = new JSDOM(cleanedHtml, {
        runScripts: 'dangerously', // Allow scripts but they won't have external resources
        resources: 'usable', // But we've already removed all external resources
        includeNodeLocations: false,
        pretendToBeVisual: false,
        // Completely disable all external resource fetching
        features: {
          FetchExternalResources: false,
          ProcessExternalResources: false,
          SkipExternalResources: false,
          // Disable specific resource types
          FetchExternalResources: ['script', 'css', 'img', 'iframe', 'object', 'embed'],
          ProcessExternalResources: ['script', 'css', 'img', 'iframe', 'object', 'embed'],
          SkipExternalResources: ['script', 'css', 'img', 'iframe', 'object', 'embed']
        },
        // Disable all external resource processing
        beforeParse(window) {
          // Remove all external resource processing capabilities
          window.CSS = undefined;
          window.StyleSheet = undefined;
          window.Image = undefined;
          window.HTMLIFrameElement = undefined;
          window.HTMLObjectElement = undefined;
          window.HTMLEmbedElement = undefined;
          
          // Override fetch to prevent any external requests
          if (window.fetch) {
            window.fetch = () => Promise.reject(new Error('External fetching disabled'));
          }
          
          // Override XMLHttpRequest to prevent external requests
          if (window.XMLHttpRequest) {
            const originalOpen = window.XMLHttpRequest.prototype.open;
            window.XMLHttpRequest.prototype.open = function(method, url) {
              if (url && !url.startsWith('data:') && !url.startsWith('blob:')) {
                throw new Error('External requests disabled');
              }
              return originalOpen.apply(this, arguments);
            };
          }
        }
      });
    } catch (jsdomError) {
      // If JSDOM fails due to CSS issues, use regex fallback immediately
      if (jsdomError.message.includes('CSS') || jsdomError.message.includes('stylesheet')) {
        console.log(`  CSS parsing failed, using regex extraction`);
        return extractUrlsWithRegex(html, baseUrl);
      }
      throw jsdomError; // Re-throw non-CSS related errors
    }
    
    const document = dom.window.document;
    
    // Get all anchor tags - wrap in try-catch to handle any CSS parsing errors
    let anchorTags;
    try {
      anchorTags = document.querySelectorAll('a[href]');
      console.log(`  - Found ${anchorTags.length} anchor tags with href attributes`);
      
      // Debug: Show first few anchor tags to understand HTML structure
      if (anchorTags.length > 0) {
        console.log(`  🔍 Sample anchor tags:`);
        for (let i = 0; i < Math.min(3, anchorTags.length); i++) {
          const anchor = anchorTags[i];
          const href = anchor.getAttribute('href');
          const text = anchor.textContent.trim();
          console.log(`    ${i + 1}. <a href="${href}">${text.substring(0, 50)}...</a>`);
        }
      }
    } catch (parseError) {
      if (parseError.message.includes('CSS') || parseError.message.includes('stylesheet')) {
        console.log(`  CSS parsing error during query, using regex extraction`);
        return extractUrlsWithRegex(html, baseUrl);
      }
      throw parseError;
    }
    
    let processedUrls = 0;
    let skippedUrls = 0;
    let patternSkipped = 0;
    let lengthSkipped = 0;
    let textSkipped = 0;
    let externalUrlsIncluded = 0;
    
    let initialValidationSkipped = 0;
    let urlParsingSkipped = 0;
    let emptyHrefSkipped = 0;
    let hashLinkSkipped = 0;
    let javascriptLinkSkipped = 0;
    let nonHttpSkipped = 0;
    
    for (const anchor of anchorTags) {
      let articleUrl = anchor.getAttribute('href');
      const linkText = anchor.textContent.trim();
      
      // Debug: Show first few URLs to understand what's being extracted
      if (processedUrls === 0 && skippedUrls < 5) {
        console.log(`    Sample URL: href="${articleUrl}" text="${linkText.substring(0, 30)}..."`);
      }
      
      // Skip empty or invalid URLs
      if (!articleUrl) {
        // Debug: Show what type of invalid URL we're rejecting
        if (skippedUrls < 3) {
          console.log(`    Rejecting: empty href attribute`);
        }
        emptyHrefSkipped++;
        initialValidationSkipped++;
        skippedUrls++;
        continue;
      }
      
      if (articleUrl === '#') {
        // Debug: Show what type of invalid URL we're rejecting
        if (skippedUrls < 3) {
          console.log(`    Rejecting: href="#" (anchor link)`);
        }
        hashLinkSkipped++;
        initialValidationSkipped++;
        skippedUrls++;
        continue;
      }
      
      if (articleUrl === 'javascript:void(0)') {
        // Debug: Show what type of invalid URL we're rejecting
        if (skippedUrls < 3) {
          console.log(`    Rejecting: href="javascript:void(0)" (JS link)`);
        }
        javascriptLinkSkipped++;
        initialValidationSkipped++;
        skippedUrls++;
        continue;
      }
      
      // Convert relative URLs to absolute
      if (articleUrl.startsWith('/')) {
        try {
          const originalUrl = articleUrl;
          articleUrl = new URL(articleUrl, baseUrl).href;
          console.log(`    Converted relative URL: ${originalUrl} → ${articleUrl}`);
        } catch (urlError) {
          urlParsingSkipped++;
          skippedUrls++;
          continue;
        }
      } else if (!articleUrl.startsWith('http')) {
        // Skip relative URLs that don't start with /
        console.log(`    Skipping non-HTTP URL: ${articleUrl}`);
        nonHttpSkipped++;
        initialValidationSkipped++;
        skippedUrls++;
        continue;
      }
      
      // Allow external URLs for all sources - let the article pattern detection filter quality
      // This enables finding articles from link aggregators and cross-site references
      try {
        const baseDomain = new URL(baseUrl).hostname;
        const articleDomain = new URL(articleUrl).hostname;
        
        // Count external URLs for reporting
        if (baseDomain !== articleDomain) {
          externalUrlsIncluded++;
          console.log(`    External URL: ${articleUrl} (from ${baseDomain})`);
        } else {
          console.log(`    Same domain URL: ${articleUrl}`);
        }
        
        // Only increment processedUrls after URL validation passes
        processedUrls++;
      } catch (urlError) {
        // If URL parsing fails, skip this URL
        console.log(`    URL parsing failed: ${articleUrl} - ${urlError.message}`);
        urlParsingSkipped++;
        skippedUrls++;
        continue;
      }
      
      // Filter out common non-article URLs
      const skipPatterns = [
        // File extensions
        /\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf|zip|rar|xml|txt|log)$/i,
        // WordPress and CMS specific
        /wp-content\/uploads/i,
        /wp-includes/i,
        /wp-admin/i,
        /_static/i,
        /_media/i,
        // RSS and feeds
        /feed/i,
        /rss/i,
        /atom/i,
        /sitemap/i,
        /robots\.txt/i,
        // UI elements
        /favicon/i,
        /search/i,
        /tag\//i,
        /category\//i,
        /author\//i,
        /page\//i,
        /comment/i,
        /login/i,
        /register/i,
        /admin/i,
        /user/i,
        /profile/i,
        /settings/i,
        /preferences/i,
        // Navigation and utility
        /about/i,
        /contact/i,
        /privacy/i,
        /terms/i,
        /help/i,
        /support/i,
        /faq/i,
        /newsletter/i,
        /subscribe/i,
        /unsubscribe/i,
        // Social and sharing
        /share/i,
        /social/i,
        /facebook/i,
        /twitter/i,
        /linkedin/i,
        /reddit/i,
        // Common non-article paths
        /archive/i,
        /archives/i,
        /index\.php/i,
        /default\.asp/i,
        // Additional patterns for new sources
        /submit/i,
        /new/i,
        /top/i,
        /hot/i,
        /rising/i,
        /controversial/i
      ];
      
      if (skipPatterns.some(pattern => pattern.test(articleUrl))) {
        patternSkipped++;
        skippedUrls++;
        continue;
      }
      
      // Skip the homepage itself
      if (articleUrl === baseUrl || articleUrl === baseUrl + '/') {
        skippedUrls++;
        continue;
      }
      
      // Skip URLs that are too short (likely not articles)
      const urlPath = new URL(articleUrl).pathname;
      if (urlPath.length < 8) { // Reduced from 10 to 8
        lengthSkipped++;
        skippedUrls++;
        continue;
      }
      
      // Skip URLs with too few slashes (likely not articles)
      const slashCount = (urlPath.match(/\//g) || []).length;
      
      // More lenient requirements - just need basic structure
      const minSlashCount = 1; // Always require at least 1 slash
      
      if (slashCount < minSlashCount) {
        lengthSkipped++;
        skippedUrls++;
        continue;
      }
      
      // Simplified approach: accept URLs that meet basic structural requirements
      // No more restrictive pattern matching - let the AI decide what's valuable
      const isMinimallyValid = urlPath.length > 12 && slashCount >= 1; // Reduced from 15 to 12
      
      if (!isMinimallyValid) {
        lengthSkipped++;
        skippedUrls++;
        continue;
      }
      
      // Only include if we have meaningful link text
      if (linkText && linkText.length > 3 && linkText.length < 300) { // Reduced from 5 to 3, increased from 200 to 300
        articleData.push({
          url: articleUrl,
          label: linkText,
          source: baseUrl // Track which website this URL came from
        });
      } else {
        textSkipped++;
      }
    }
    
    // Remove duplicates and limit to reasonable number
    const uniqueArticles = [];
    const seenUrls = new Set();
    
    for (const article of articleData) {
      if (!seenUrls.has(article.url)) {
        seenUrls.add(article.url);
        uniqueArticles.push(article);
      }
    }
    
    const finalArticles = uniqueArticles.slice(0, 1000);
    
    if (finalArticles.length > 0) {
      console.log(`  ${finalArticles.length} articles found`);
    } else {
      console.log(`  ⚠️ No articles found`);
    }
    
    // Log detailed skip reasons for debugging
    console.log(`  📊 Skip breakdown: ${initialValidationSkipped} initial (${emptyHrefSkipped} empty, ${hashLinkSkipped} hash, ${javascriptLinkSkipped} js, ${nonHttpSkipped} non-http), ${urlParsingSkipped} parsing, ${patternSkipped} pattern, ${lengthSkipped} length, ${textSkipped} text, ${processedUrls} processed`);
    
    // Show external URLs count for link aggregator sites
    if (externalUrlsIncluded > 0) {
      console.log(`  🌐 External URLs included: ${externalUrlsIncluded} (from link aggregator sites)`);
    }
    
    // Show some sample URLs that were processed (for debugging)
    if (finalArticles.length > 0) {
      console.log(`  📝 Sample URLs found:`);
      finalArticles.slice(0, 3).forEach((article, index) => {
        console.log(`    ${index + 1}. ${article.url.substring(0, 80)}...`);
      });
    }
    
    console.log(`  🔍 Debug mode: showing first 5 URLs for analysis`);
    let debugCount = 0;
    for (const anchor of anchorTags) {
      if (debugCount >= 5) break;
      const url = anchor.getAttribute('href');
      const text = anchor.textContent.trim();
      if (url && url !== '#' && url !== 'javascript:void(0)' && text.length > 0) {
        console.log(`    Debug URL: ${url} | Text: "${text.substring(0, 50)}..."`);
        debugCount++;
      }
    }
    
    // Also show some URLs that made it through initial validation
    if (processedUrls > 0) {
      console.log(`  ✅ URLs that passed initial validation: ${processedUrls}`);
    } else {
      console.log(`  ❌ No URLs passed initial validation - all were filtered out early`);
    }
    
    return finalArticles;
    
  } catch (error) {
    // Check for any CSS-related errors and use fallback
    if (error.message.includes('CSS') || error.message.includes('stylesheet') || 
        error.stack?.includes('stylesheets.js') || error.stack?.includes('HTMLStyleElement')) {
      console.log(`  CSS parsing error, using regex extraction`);
      return extractUrlsWithRegex(html, baseUrl);
    }
    
    console.error(`❌ Error extracting article URLs from ${baseUrl}: ${error.message}`);
    return [];
  }
}

// Helper function to estimate token count for a batch
function estimateTokenCount(urlsWithLabels) {
  // Rough estimation: each URL + label is about 50-100 tokens
  // System prompt is about 200 tokens
  // User prompt template is about 100 tokens
  const baseTokens = 300; // System prompt + user prompt template
  const perUrlTokens = 75; // Conservative estimate per URL
  return baseTokens + (urlsWithLabels.length * perUrlTokens);
}

// Helper function to calculate optimal batch size
function calculateOptimalBatchSize(urlsWithLabels) {
  // Allow configuration through environment variables
  const MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || '6000'); // Conservative limit to stay well under 8192
  const baseTokens = 300;
  const perUrlTokens = 75;
  
  // Calculate how many URLs we can fit
  const availableTokens = MAX_TOKENS - baseTokens;
  const maxUrls = Math.floor(availableTokens / perUrlTokens);
  
  // Use a conservative batch size, minimum 5, maximum 20
  // Allow override through environment variable
  const maxBatchSize = parseInt(process.env.LLM_MAX_BATCH_SIZE || '20');
  const minBatchSize = parseInt(process.env.LLM_MIN_BATCH_SIZE || '5');
  
  // Ensure we don't exceed the calculated maximum
  const optimalSize = Math.max(minBatchSize, Math.min(maxUrls, maxBatchSize));
  
  // Log the batch size calculation for debugging
  if (process.env.DEBUG_BATCHING === 'true') {
    console.log(`  🔧 Batch size calculation: MAX_TOKENS=${MAX_TOKENS}, available=${availableTokens}, maxUrls=${maxUrls}, optimal=${optimalSize}`);
  }
  
  return optimalSize;
}

// Helper function to analyze URLs with AI in batches
async function analyzeUrlsWithAI(urlsWithLabels, sourceUrl) {
  try {
    if (urlsWithLabels.length === 0) {
      console.log(`  ⚠️ No URLs to analyze for ${sourceUrl}`);
      return [];
    }
    
    // Calculate optimal batch size based on token estimation
    const batchSize = calculateOptimalBatchSize(urlsWithLabels);
    const batches = [];
    
    // Split URLs into batches
    for (let i = 0; i < urlsWithLabels.length; i += batchSize) {
      batches.push(urlsWithLabels.slice(i, i + batchSize));
    }
    
    console.log(`  📦 Processing ${urlsWithLabels.length} URLs in ${batches.length} batches of ~${batchSize}`);
    
    const allAnalyzedArticles = [];
    let successfulBatches = 0;
    let failedBatches = 0;
    let retriedBatches = 0;
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const estimatedTokens = estimateTokenCount(batch);
      
      console.log(`  🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} URLs, ~${estimatedTokens} tokens)`);
      
      const urlList = batch.map(item => `${item.label} -> ${item.url}`).join('\n');
      
      const prompt = `Please analyze this batch of URLs and their link text labels from a tech website and identify the best articles for a tech news platform called "refetch".

Source: ${sourceUrl}
Batch: ${batchIndex + 1}/${batches.length}
URLs and Labels:
${urlList}

Please return a JSON response with the structure specified in the system prompt. Focus on finding high-quality tech content that would be valuable to developers and open source enthusiasts. Only include URLs that are actually articles, not about pages, contact forms, etc.`;

      let batchSuccess = false;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (!batchSuccess && retryCount <= maxRetries) {
        try {
          if (retryCount > 0) {
            console.log(`  🔄 Retrying batch ${batchIndex + 1} (attempt ${retryCount + 1}/${maxRetries + 1})`);
            await delay(2000 * retryCount); // Exponential backoff
          }
          
          const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 4000 // Reduced from 8000 to be more conservative
          });
          
          const response = completion.choices[0].message.content;
          
          try {
            let jsonResponse = response;
            if (response.includes('{') && response.includes('}')) {
              const startIndex = response.indexOf('{');
              const endIndex = response.lastIndexOf('}') + 1;
              jsonResponse = response.substring(startIndex, endIndex);
            }
            
            const analysis = JSON.parse(jsonResponse);
            
            if (!analysis.articles || !Array.isArray(analysis.articles)) {
              throw new Error('Invalid AI response structure');
            }
            
            const validArticles = analysis.articles.filter(article => {
              if (!article.url || !article.refetchTitle || !article.discussionStarter) {
                return false;
              }
              return true;
            });
            
            // Add source information to each article
            validArticles.forEach(article => {
              article.source = sourceUrl;
            });
            
            allAnalyzedArticles.push(...validArticles);
            successfulBatches++;
            batchSuccess = true;
            
            if (retryCount > 0) {
              retriedBatches++;
              console.log(`  ✅ Batch ${batchIndex + 1}: ${validArticles.length}/${analysis.articles.length} articles valid (recovered after retry)`);
            } else {
              console.log(`  ✅ Batch ${batchIndex + 1}: ${validArticles.length}/${analysis.articles.length} articles valid`);
            }
            
          } catch (parseError) {
            throw new Error(`Parse error: ${parseError.message}`);
          }
          
        } catch (error) {
          retryCount++;
          if (retryCount > maxRetries) {
            console.log(`  ❌ Batch ${batchIndex + 1}: Failed after ${maxRetries + 1} attempts - ${error.message}`);
            failedBatches++;
            break;
          }
        }
      }
      
      // Add delay between batches to avoid rate limiting
      if (batchIndex < batches.length - 1) {
        await delay(1000);
      }
    }
    
    console.log(`  🎯 Total valid articles from ${sourceUrl}: ${allAnalyzedArticles.length} (${successfulBatches}/${batches.length} batches successful)`);
    
    if (failedBatches > 0) {
      console.log(`  ⚠️ ${failedBatches} batches failed for ${sourceUrl}`);
    }
    
    if (retriedBatches > 0) {
      console.log(`  🔄 ${retriedBatches} batches were recovered after retries`);
    }
    
    return allAnalyzedArticles;
    
  } catch (error) {
    console.error(`❌ ${sourceUrl}: ${error.message}`);
    return [];
  }
}

// Helper function to check for duplicate URLs in bulk using array query
async function checkDuplicateUrlsBulk(urls) {
  try {
    if (urls.length === 0) {
      return new Set();
    }
    
    const cleanUrls = urls.map(url => cleanUrl(url));
    
    console.log(`  🔍 Checking ${cleanUrls.length} URLs for duplicates using array query...`);
    
    // Use Appwrite's array query to find existing posts with matching links
    // This is much more efficient than fetching all documents
    const existingPosts = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID || '',
      process.env.APPWRITE_POSTS_COLLECTION_ID || '',
      [
        Query.equal('link', cleanUrls)
      ]
    );
    
    // Extract the duplicate URLs from the results
    const duplicateUrls = new Set(
      existingPosts.documents.map(post => post.link)
    );
    
    console.log(`  ✅ Found ${duplicateUrls.size} duplicate URLs out of ${cleanUrls.length} total URLs`);
    return duplicateUrls;
    
  } catch (error) {
    console.error(`❌ Bulk duplicate check failed: ${error.message}`);
    // Return empty set to avoid blocking the process
    return new Set();
  }
}

// Helper function to check for duplicate URLs
async function checkDuplicateUrl(url) {
  try {
    const cleanUrlString = cleanUrl(url);
    const existingPosts = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID || '',
      process.env.APPWRITE_POSTS_COLLECTION_ID || '',
      [Query.equal('link', cleanUrlString)]
    );
    
    return existingPosts.documents.length > 0;
  } catch (error) {
    console.error(`❌ Duplicate check failed: ${error.message}`);
    return false;
  }
}

// Helper function to add article to database
async function addArticleToDatabase(article) {
  try {
    // Check for duplicates
    const isDuplicate = await checkDuplicateUrl(article.url);
    if (isDuplicate) {
      return { success: false, reason: 'duplicate' };
    }
    
    // Prepare document data
    const documentData = {
      title: article.refetchTitle || 'Untitled Article',
      description: '', // Will be enhanced by the enhancement function later
      userId: process.env.SCOUT_USER_ID || '',
      userName: process.env.SCOUT_USER_NAME || 'Scout',
      count: 0,
      countUp: 0,
      countDown: 0,
      type: 'link', // Default to 'link' type
      enhanced: false, // Will be enhanced by the enhancement function later
      timeScore: 100,
      link: cleanUrl(article.url)
    };
    
    // Create the document
    const createdDocument = await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID || '',
      process.env.APPWRITE_POSTS_COLLECTION_ID || '',
      ID.unique(),
      documentData
    );
    
    // Create the discussion starter comment
    if (article.discussionStarter && article.discussionStarter.trim().length > 0) {
      try {
        const commentDocument = await databases.createDocument(
          process.env.APPWRITE_DATABASE_ID || '',
          process.env.APPWRITE_COMMENTS_COLLECTION_ID || '',
          ID.unique(),
          {
            postId: createdDocument.$id,
            userId: process.env.SCOUT_USER_ID || '',
            userName: process.env.SCOUT_USER_NAME || 'Scout',
            content: article.discussionStarter.trim(),
            count: 0
          }
        );
        
        // Update the post with the comment count
        await databases.updateDocument(
          process.env.APPWRITE_DATABASE_ID || '',
          process.env.APPWRITE_POSTS_COLLECTION_ID || '',
          createdDocument.$id,
          { countComments: 1 }
        );
        
      } catch (commentError) {
        console.error(`❌ Comment creation failed: ${commentError.message}`);
      }
    }
    
    return { success: true, documentId: createdDocument.$id };
    
  } catch (error) {
    if (error.message.includes('not authorized')) {
      return { success: false, reason: 'permission_error', error: 'Function lacks database write permissions' };
    }
    return { success: false, reason: 'database_error', error: error.message };
  }
}

// Helper function to extract domain from URL
function extractDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    // If URL parsing fails, try to extract domain manually
    const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    return match ? match[1] : 'unknown-domain';
  }
}

// Helper function to delay between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main scout function
async function scoutArticles() {
  const startTime = Date.now();
  const results = {
    websitesScraped: 0,
    articlesAnalyzed: 0,
    articlesAdded: 0,
    duplicatesSkipped: 0,
    errors: [],
    executionTime: '',
    urlBreakdown: {
      totalUrlsFound: 0,
      duplicatesRemoved: 0,
      uniqueUrlsRemaining: 0,
      urlsAnalyzed: 0,
      urlsFilteredOut: 0,
      urlsFailedAnalysis: 0
    },
    failedUrls: {
      analysis: [],
      database: []
    }
  };
  
  try {
    console.log('🚀 Starting scout function...');
    
    // Initialize clients
    initializeClients();
    
    // Validate environment variables
    const requiredEnvVars = ['OPENAI_API_KEY', 'SCOUT_USER_ID'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    // Step 1: Scrape main pages and extract article URLs
    console.log('\n📋 Step 1: Scraping websites for article URLs...');
    const allArticlesData = [];
    
    const TARGET_WEBSITES = getTargetWebsites();
    
    for (let i = 0; i < TARGET_WEBSITES.length; i++) {
      const url = TARGET_WEBSITES[i];
      console.log(`[${i + 1}/${TARGET_WEBSITES.length}] ${url}`);
      
      const mainPageHtml = await scrapeWebsiteForArticles(url);
      if (mainPageHtml) {
        const articlesData = extractArticleUrlsWithLabels(mainPageHtml, url);
        allArticlesData.push(...articlesData);
        results.websitesScraped++;
        results.urlBreakdown.totalUrlsFound += articlesData.length;
      }
      
      await delay(parseInt(process.env.SCRAPING_DELAY_MS || '3000'));
    }
    
    console.log(`✅ Found ${allArticlesData.length} total URLs from ${results.websitesScraped} websites`);
    
    // Show breakdown by source
    const sourceBreakdown = {};
    allArticlesData.forEach(article => {
      sourceBreakdown[article.source] = (sourceBreakdown[article.source] || 0) + 1;
    });
    
    console.log('📊 URLs by source:');
    Object.entries(sourceBreakdown).forEach(([source, count]) => {
      const shortSource = source.replace('https://', '').replace('www.', '');
      console.log(`  ${shortSource}: ${count} URLs`);
    });
    
    // Step 1.5: Check for duplicates before AI analysis
    console.log('\n🔍 Step 1.5: Checking for duplicate URLs...');
    const allUrls = allArticlesData.map(article => article.url);
    const duplicateUrls = await checkDuplicateUrlsBulk(allUrls);
    
    // Filter out duplicate URLs from the articles data
    const uniqueArticlesData = allArticlesData.filter(article => !duplicateUrls.has(cleanUrl(article.url)));
    
    console.log(`✅ Removed ${duplicateUrls.size} duplicate URLs, ${uniqueArticlesData.length} unique URLs remaining`);
    
    // Show deduplication breakdown by source
    if (duplicateUrls.size > 0) {
      console.log('📊 Duplicates by source:');
      const duplicateSourceBreakdown = {};
      allArticlesData.forEach(article => {
        if (duplicateUrls.has(cleanUrl(article.url))) {
          duplicateSourceBreakdown[article.source] = (duplicateSourceBreakdown[article.source] || 0) + 1;
        }
      });
      Object.entries(duplicateSourceBreakdown).forEach(([source, count]) => {
        const shortSource = source.replace('https://', '').replace('www.', '');
        console.log(`  ${shortSource}: ${count} duplicates`);
      });
    }
    
    // Update results
    results.urlBreakdown.duplicatesRemoved = duplicateUrls.size;
    results.urlBreakdown.uniqueUrlsRemaining = uniqueArticlesData.length;
    
    // Step 2: Analyze URLs with AI
    console.log('\n🤖 Step 2: AI analysis of URLs...');
    const analyzedArticles = [];
    let totalBatchesProcessed = 0;
    let totalBatchesSuccessful = 0;
    let totalBatchesFailed = 0;
    
    // Process each website's URLs separately for better context
    for (let i = 0; i < TARGET_WEBSITES.length; i++) {
      const sourceUrl = TARGET_WEBSITES[i];
      
      const sourceArticles = uniqueArticlesData.filter(article => {
        // Use the source field we tracked during extraction
        return article.source === sourceUrl;
      });
      
      if (sourceArticles.length === 0) {
        console.log(`  ⚠️ No URLs found for ${sourceUrl}`);
        continue;
      }
      
      // Limit URLs per source to ensure balanced coverage
      const MAX_URLS_PER_SOURCE = parseInt(process.env.MAX_URLS_PER_SOURCE || '25');
      const limitedSourceArticles = sourceArticles.slice(0, MAX_URLS_PER_SOURCE);
      
      if (sourceArticles.length > MAX_URLS_PER_SOURCE) {
        console.log(`  📊 Limiting ${sourceArticles.length} URLs to ${MAX_URLS_PER_SOURCE} for balanced coverage`);
      }
      
      console.log(`  📤 Sending ${limitedSourceArticles.length} URLs to LLM from ${sourceUrl}`);
      
      try {
        const analyzedSourceArticles = await analyzeUrlsWithAI(limitedSourceArticles, sourceUrl);
        analyzedArticles.push(...analyzedSourceArticles);
        results.urlBreakdown.urlsAnalyzed += analyzedSourceArticles.length;
        
        // Estimate batch counts for this source
        const estimatedBatchSize = calculateOptimalBatchSize(limitedSourceArticles);
        const estimatedBatches = Math.ceil(limitedSourceArticles.length / estimatedBatchSize);
        totalBatchesProcessed += estimatedBatches;
        
        console.log(`  ✅ LLM returned ${analyzedSourceArticles.length} valid articles from ${sourceUrl}`);
        
      } catch (error) {
        console.error(`  ❌ Failed to analyze URLs from ${sourceUrl}: ${error.message}`);
        results.failedUrls.analysis.push({
          source: sourceUrl,
          error: error.message,
          urlsCount: limitedSourceArticles.length
        });
        continue;
      }
      
      // Add delay between websites to avoid overwhelming the API
      if (i < TARGET_WEBSITES.length - 1) {
        console.log(`  ⏳ Waiting 3 seconds before processing next website...`);
        await delay(3000);
      }
    }
    
    console.log(`✅ Analyzed ${analyzedArticles.length}/${uniqueArticlesData.length} URLs successfully`);
    
    // Show batching summary if we had multiple batches
    if (totalBatchesProcessed > 1) {
      console.log(`📊 Batching Summary: Processed ${allArticlesData.length} URLs in approximately ${totalBatchesProcessed} batches to avoid token limits`);
    }
    
    // Step 3: Add articles to database
    console.log('\n💾 Step 3: Adding articles to database...');
    
    const maxArticles = parseInt(process.env.MAX_ARTICLES_PER_RUN || '1000');
    const articlesToProcess = analyzedArticles.slice(0, maxArticles);
    
    console.log(`Processing ${articlesToProcess.length} articles (max: ${maxArticles})`);
    
    // Show breakdown of articles by source
    const articleSourceBreakdown = {};
    articlesToProcess.forEach(article => {
      const source = article.source || extractDomainFromUrl(article.url);
      articleSourceBreakdown[source] = (articleSourceBreakdown[source] || 0) + 1;
    });
    
    console.log('📊 Articles to process by source:');
    Object.entries(articleSourceBreakdown).forEach(([source, count]) => {
      const shortSource = source.replace('https://', '').replace('www.', '');
      console.log(`  ${shortSource}: ${count} articles`);
    });
    
    for (const article of articlesToProcess) {
      const result = await addArticleToDatabase(article);
      
      if (result.success) {
        results.articlesAdded++;
        const shortSource = (article.source || extractDomainFromUrl(article.url)).replace('https://', '').replace('www.', '');
        console.log(`✅ Added [${shortSource}]: ${article.refetchTitle.substring(0, 60)}...`);
      } else if (result.reason === 'duplicate') {
        results.duplicatesSkipped++;
        const shortSource = (article.source || extractDomainFromUrl(article.url)).replace('https://', '').replace('www.', '');
        console.log(`⏭️ Duplicate [${shortSource}]: ${article.refetchTitle.substring(0, 60)}...`);
      } else {
        results.errors.push(`Failed to add ${article.url}: ${result.reason}`);
        const shortSource = (article.source || extractDomainFromUrl(article.url)).replace('https://', '').replace('www.', '');
        console.log(`❌ Failed [${shortSource}]: ${article.refetchTitle.substring(0, 60)}... - ${result.reason}`);
        results.failedUrls.database.push({ 
          url: article.url, 
          reason: result.reason,
          error: result.error || 'Unknown error'
        });
      }
      
      await delay(500);
    }
    
    // Calculate execution time
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    results.executionTime = `${executionTime}s`;
    
    console.log('\n🎉 Scout completed successfully!');
    console.log(`📊 Results: ${results.websitesScraped} sites → ${results.urlBreakdown.totalUrlsFound} URLs → ${results.urlBreakdown.duplicatesRemoved} duplicates removed → ${results.urlBreakdown.uniqueUrlsRemaining} unique URLs → ${results.articlesAdded} articles added in ${results.executionTime}s`);
    
    // Show final breakdown by source
    if (analyzedArticles.length > 0) {
      const finalSourceBreakdown = {};
      analyzedArticles.forEach(article => {
        const source = article.source || extractDomainFromUrl(article.url);
        finalSourceBreakdown[source] = (finalSourceBreakdown[source] || 0) + 1;
      });
      
      console.log('📊 Final articles by source:');
      Object.entries(finalSourceBreakdown).forEach(([source, count]) => {
        const shortSource = source.replace('https://', '').replace('www.', '');
        console.log(`  ${shortSource}: ${count} articles`);
      });
    }
    
    // Log failures only if they exist
    const totalFailures = results.failedUrls.analysis.length + results.failedUrls.database.length;
    if (totalFailures > 0) {
      console.log(`❌ ${totalFailures} failures: ${results.failedUrls.analysis.length} analysis, ${results.failedUrls.database.length} database`);
    }
    
    if (results.errors.length > 0) {
      console.log(`⚠️ ${results.errors.length} errors encountered`);
    }
    
    return {
      success: true,
      ...results
    };
    
  } catch (error) {
    console.error(`❌ Scout function failed: ${error.message}`);
    if (error.stack) {
      console.error(`  - Stack trace: ${error.stack.split('\n')[1]?.trim() || 'N/A'}`);
    }
    results.errors.push(error.message);
    results.executionTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
    
    return {
      success: false,
      ...results
    };
  }
}

// Main function entry point
export default async function (req) {
  try {
    console.log('Scout function invoked');
    
    // Run the scout function
    const result = await scoutArticles();
    
    // Return the result directly (Appwrite Functions handle the response)
    return result;
    
  } catch (error) {
    console.error(`Unexpected error in scout function: ${error.message}`);
    return {
      success: false,
      error: error.message,
      executionTime: '0s'
    };
  }
}

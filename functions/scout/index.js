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
const TARGET_WEBSITES = [
  "https://techcrunch.com",
  "https://theverge.com", 
  "https://arstechnica.com",
  "https://wired.com",
  "https://venturebeat.com",
  "https://infoq.com",
  "https://theregister.com",
  "https://news.ycombinator.com"
];

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
      
      if (!baseUrl.includes('news.ycombinator.com') && !fullUrl.startsWith(baseUrl)) {
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
async function scrapeWebsiteForArticles(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    if (response.status === 200) {
      return response.data;
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
    
    // Try to create JSDOM with CSS completely disabled
    let dom;
    try {
      dom = new JSDOM(cleanedHtml, {
        runScripts: 'outside-only',
        resources: 'usable',
        includeNodeLocations: false,
        pretendToBeVisual: false,
        // Completely disable CSS parsing
        features: {
          FetchExternalResources: false,
          ProcessExternalResources: false,
          SkipExternalResources: false
        },
        // Disable all CSS processing
        beforeParse(window) {
          // Remove CSS processing capabilities
          window.CSS = undefined;
          window.StyleSheet = undefined;
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
    } catch (parseError) {
      if (parseError.message.includes('CSS') || parseError.message.includes('stylesheet')) {
        console.log(`  CSS parsing error during query, using regex extraction`);
        return extractUrlsWithRegex(html, baseUrl);
      }
      throw parseError;
    }
    
    let processedUrls = 0;
    let skippedUrls = 0;
    
    for (const anchor of anchorTags) {
      let articleUrl = anchor.getAttribute('href');
      const linkText = anchor.textContent.trim();
      processedUrls++;
      
      // Skip empty or invalid URLs
      if (!articleUrl || articleUrl === '#' || articleUrl === 'javascript:void(0)') {
        skippedUrls++;
        continue;
      }
      
      // Convert relative URLs to absolute
      if (articleUrl.startsWith('/')) {
        articleUrl = new URL(articleUrl, baseUrl).href;
      } else if (!articleUrl.startsWith('http')) {
        // Skip relative URLs that don't start with /
        skippedUrls++;
        continue;
      }
      
      // For Hacker News, include external URLs (they link to other sites)
      // For other sites, only include URLs from the same domain
      if (baseUrl.includes('news.ycombinator.com')) {
        // HN links to external sites, so we need to handle this differently
        // We'll include external URLs but mark them as HN-sourced
      } else if (!articleUrl.startsWith(baseUrl)) {
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
        /default\.asp/i
      ];
      
      if (skipPatterns.some(pattern => pattern.test(articleUrl))) {
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
      if (urlPath.length < 10) {
        skippedUrls++;
        continue;
      }
      
      // Skip URLs with too few slashes (likely not articles)
      const slashCount = (urlPath.match(/\//g) || []).length;
      if (slashCount < 2) {
        skippedUrls++;
        continue;
      }
      
      // Look for article-like patterns in the URL
      const articlePatterns = [
        /\d{4}\/\d{2}\/\d{2}/i,  // Date patterns (YYYY/MM/DD)
        /\d{4}\/\d{2}/i,          // Date patterns (YYYY/MM)
        /article/i,
        /story/i,
        /news/i,
        /post/i,
        /blog/i,
        /entry/i,
        /item/i
      ];
      
      // Only include URLs that match at least one article pattern
      if (!articlePatterns.some(pattern => pattern.test(articleUrl))) {
        skippedUrls++;
        continue;
      }
      
      // Only include if we have meaningful link text
      if (linkText && linkText.length > 5 && linkText.length < 200) {
        articleData.push({
          url: articleUrl,
          label: linkText,
          source: baseUrl // Track which website this URL came from
        });
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
    
    // Step 2: Analyze URLs with AI
    console.log('\n🤖 Step 2: AI analysis of URLs...');
    const analyzedArticles = [];
    let totalBatchesProcessed = 0;
    let totalBatchesSuccessful = 0;
    let totalBatchesFailed = 0;
    
    // Process each website's URLs separately for better context
    for (let i = 0; i < TARGET_WEBSITES.length; i++) {
      const sourceUrl = TARGET_WEBSITES[i];
      
      const sourceArticles = allArticlesData.filter(article => {
        // Use the source field we tracked during extraction
        return article.source === sourceUrl;
      });
      
      if (sourceArticles.length === 0) {
        console.log(`  ⚠️ No URLs found for ${sourceUrl}`);
        continue;
      }
      
      console.log(`  📤 Sending ${sourceArticles.length} URLs to LLM from ${sourceUrl}`);
      
      try {
        const analyzedSourceArticles = await analyzeUrlsWithAI(sourceArticles, sourceUrl);
        analyzedArticles.push(...analyzedSourceArticles);
        results.urlBreakdown.urlsAnalyzed += analyzedSourceArticles.length;
        
        // Estimate batch counts for this source
        const estimatedBatchSize = calculateOptimalBatchSize(sourceArticles);
        const estimatedBatches = Math.ceil(sourceArticles.length / estimatedBatchSize);
        totalBatchesProcessed += estimatedBatches;
        
        console.log(`  ✅ LLM returned ${analyzedSourceArticles.length} valid articles from ${sourceUrl}`);
        
      } catch (error) {
        console.error(`  ❌ Failed to analyze URLs from ${sourceUrl}: ${error.message}`);
        results.failedUrls.analysis.push({
          source: sourceUrl,
          error: error.message,
          urlsCount: sourceArticles.length
        });
        continue;
      }
      
      // Add delay between websites to avoid overwhelming the API
      if (i < TARGET_WEBSITES.length - 1) {
        console.log(`  ⏳ Waiting 3 seconds before processing next website...`);
        await delay(3000);
      }
    }
    
    console.log(`✅ Analyzed ${analyzedArticles.length}/${allArticlesData.length} URLs successfully`);
    
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
    console.log(`📊 Results: ${results.websitesScraped} sites → ${results.urlBreakdown.totalUrlsFound} URLs → ${results.articlesAdded} articles added (${results.duplicatesSkipped} duplicates) in ${results.executionTime}s`);
    
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

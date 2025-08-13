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
          label: label
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
    
    // Use jsdom to properly parse HTML and extract <a> tags
    // Disable CSS parsing to avoid stylesheet errors
    const dom = new JSDOM(html, {
      runScripts: 'outside-only',
      resources: 'usable',
      includeNodeLocations: false,
      pretendToBeVisual: false,
      // Disable CSS parsing to avoid stylesheet errors
      features: {
        FetchExternalResources: false,
        ProcessExternalResources: false,
        SkipExternalResources: false
      }
    });
    const document = dom.window.document;
    
    // Get all anchor tags
    const anchorTags = document.querySelectorAll('a[href]');
    console.log(`  - Found ${anchorTags.length} anchor tags with href attributes`);
    
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
      
      // Only include URLs from the same domain (except for HN)
      if (!baseUrl.includes('news.ycombinator.com') && !articleUrl.startsWith(baseUrl)) {
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
          label: linkText
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
    
    const finalArticles = uniqueArticles.slice(0, 100);
    
    if (finalArticles.length > 0) {
      console.log(`  ${finalArticles.length} articles found`);
    } else {
      console.log(`  ⚠️ No articles found`);
    }
    
    return finalArticles;
    
  } catch (error) {
    console.error(`❌ Error extracting article URLs from ${baseUrl}: ${error.message}`);
    if (error.message.includes('CSS stylesheet')) {
      console.error(`  - CSS parsing error, trying fallback regex extraction`);
      return extractUrlsWithRegex(html, baseUrl);
    }
    return [];
  }
}

// Helper function to analyze URLs with AI in batches
async function analyzeUrlsWithAI(urlsWithLabels, sourceUrl) {
  try {
    const urlList = urlsWithLabels.map(item => `${item.label} -> ${item.url}`).join('\n');
    
    const prompt = `Please analyze this list of URLs and their link text labels from a tech website and identify the best articles for a tech news platform called "refetch".

Source: ${sourceUrl}
URLs and Labels:
${urlList}

Please return a JSON response with the structure specified in the system prompt. Focus on finding high-quality tech content that would be valuable to developers and open source enthusiasts. Only include URLs that are actually articles, not about pages, contact forms, etc.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
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
        console.error(`❌ ${sourceUrl}: Invalid AI response structure`);
        return [];
      }
      
      const validArticles = analysis.articles.filter(article => {
        if (!article.url || !article.refetchTitle || !article.discussionStarter) {
          return false;
        }
        return true;
      });
      
      console.log(`  ${validArticles.length}/${analysis.articles.length} articles valid`);
      return validArticles;
      
    } catch (parseError) {
      console.error(`❌ ${sourceUrl}: Parse error - ${parseError.message}`);
      return [];
    }
    
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
    
    // Step 2: Analyze URLs with AI
    console.log('\n🤖 Step 2: AI analysis of URLs...');
    const analyzedArticles = [];
    
    // Process each website's URLs separately for better context
    for (let i = 0; i < TARGET_WEBSITES.length; i++) {
      const sourceUrl = TARGET_WEBSITES[i];
      const sourceArticles = allArticlesData.filter(article => {
        try {
          return new URL(article.url).hostname === new URL(sourceUrl).hostname;
        } catch {
          return false;
        }
      });
      
      if (sourceArticles.length === 0) continue;
      
      console.log(`[${i + 1}/${TARGET_WEBSITES.length}] ${sourceUrl} (${sourceArticles.length} URLs)`);
      
      const analyzedSourceArticles = await analyzeUrlsWithAI(sourceArticles, sourceUrl);
      analyzedArticles.push(...analyzedSourceArticles);
      results.urlBreakdown.urlsAnalyzed += analyzedSourceArticles.length;
      
      await delay(2000);
    }
    
    console.log(`✅ Analyzed ${analyzedArticles.length}/${allArticlesData.length} URLs successfully`);
    
    // Step 3: Add articles to database
    console.log('\n💾 Step 3: Adding articles to database...');
    
    const maxArticles = parseInt(process.env.MAX_ARTICLES_PER_RUN || '20');
    const articlesToProcess = analyzedArticles.slice(0, maxArticles);
    
    console.log(`Processing ${articlesToProcess.length} articles (max: ${maxArticles})`);
    
    for (const article of articlesToProcess) {
      const result = await addArticleToDatabase(article);
      
      if (result.success) {
        results.articlesAdded++;
        console.log(`✅ Added: ${article.refetchTitle.substring(0, 60)}...`);
      } else if (result.reason === 'duplicate') {
        results.duplicatesSkipped++;
        console.log(`⏭️ Duplicate: ${article.refetchTitle.substring(0, 60)}...`);
      } else {
        results.errors.push(`Failed to add ${article.url}: ${result.reason}`);
        console.log(`❌ Failed: ${article.refetchTitle.substring(0, 60)}... - ${result.reason}`);
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

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

Analyze the provided HTML content and return a JSON response with the following structure:

{
  "refetchTitle": "A clear, informative title that feels like refetch style - similar to HN but focused on open source alternatives, tech discussions, and developer interests. Should be engaging without being clickbait.",
  "discussionStarter": "An engaging comment (2-3 sentences) that will kick off a good discussion. Should highlight the key points, ask a thought-provoking question, or share an interesting perspective that will get developers talking.",
  "qualityScore": 75
}

CRITICAL GUIDELINES:
- Respond with ONLY the JSON object, no additional text
- "refetchTitle" should be clear, informative, and developer-focused
- "discussionStarter" should be engaging and conversation-starting
- Focus on content that would be valuable to developers, open source enthusiasts, and tech professionals
- Quality score should reflect how well the content fits the refetch community's interests (0-100)
- Look for articles with substantial content, not just headlines or minimal text
- If you cannot analyze the content properly, return null for all fields
- The discussionStarter should be the kind of comment that would start a good conversation on HN or refetch`;

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

// Helper function to scrape a website's main page and extract article links
async function scrapeWebsiteForArticles(url) {
  try {
    console.log(`\n🔍 Scraping ${url} for article links...`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    if (response.status === 200) {
      console.log(`✅ Successfully scraped ${url} (${(response.data.length / 1024).toFixed(1)}KB)`);
      return response.data;
    } else {
      console.error(`❌ Failed to scrape ${url}: HTTP ${response.status}`);
      return null;
    }
    
  } catch (error) {
    console.error(`❌ Error scraping ${url}:`, error.message);
    return null;
  }
}

// Helper function to extract article URLs from a website's main page
function extractArticleUrls(html, baseUrl) {
  try {
    const articleUrls = [];
    
    // Use jsdom to properly parse HTML and extract <a> tags
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Get all anchor tags
    const anchorTags = document.querySelectorAll('a[href]');
    console.log(`  - Found ${anchorTags.length} anchor tags with href attributes`);
    
    let processedUrls = 0;
    let skippedUrls = 0;
    
    for (const anchor of anchorTags) {
      let articleUrl = anchor.getAttribute('href');
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
      
      articleUrls.push(articleUrl);
    }
    
    // Remove duplicates and limit to reasonable number
    const uniqueUrls = [...new Set(articleUrls)].slice(0, 100);
    
    console.log(`📊 URL Extraction Results for ${baseUrl}:`);
    console.log(`  - Raw URLs found: ${processedUrls}`);
    console.log(`  - Skipped due to empty/invalid/relative/domain/pattern: ${skippedUrls}`);
    console.log(`  - After deduplication: ${uniqueUrls.length}`);
    
    // Log a few sample URLs for debugging
    if (uniqueUrls.length > 0) {
      console.log(`  - Sample URLs: ${uniqueUrls.slice(0, 5).join(', ')}`);
    } else {
      console.log(`  - ⚠️ No valid article URLs found for ${baseUrl}`);
    }
    
    // Log some examples of what was filtered out (for debugging)
    if (processedUrls > uniqueUrls.length) {
      console.log(`  - Note: ${processedUrls - uniqueUrls.length} URLs were filtered out during processing`);
    }
    
    return uniqueUrls;
    
  } catch (error) {
    console.error(`❌ Error extracting article URLs from ${baseUrl}:`, error.message);
    return [];
  }
}

// Helper function to scrape an individual article and get its content
async function scrapeArticle(url) {
  try {
    console.log(`\n📄 Scraping article: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    if (response.status === 200) {
      const contentLength = response.data.length;
      const contentKB = (contentLength / 1024).toFixed(1);
      console.log(`✅ Successfully scraped article: ${url} (${contentKB}KB)`);
      
      // Log content preview for debugging
      const preview = response.data.substring(0, 200).replace(/\s+/g, ' ').trim();
      console.log(`  - Content preview: "${preview}..."`);
      
      return response.data;
    } else {
      console.error(`❌ Failed to scrape article ${url}: HTTP ${response.status}`);
      return null;
    }
    
  } catch (error) {
    console.error(`❌ Error scraping article ${url}:`, error.message);
    return null;
  }
}

// Helper function to analyze HTML with AI
async function analyzeHTMLWithAI(html, url) {
  try {
    console.log(`\n🤖 Analyzing HTML from ${url}...`);
    
    // Truncate HTML if it's too long for the AI
    const maxLength = 6000; // Reduced to avoid token limit issues
    const truncatedHTML = html.length > maxLength ? html.substring(0, maxLength) + '...' : html;
    
    console.log(`  - Original HTML length: ${html.length} chars`);
    console.log(`  - Truncated to: ${truncatedHTML.length} chars for AI analysis`);
    
    const prompt = `Please analyze this HTML content from a tech website and identify the best articles for a tech news platform called "refetch".

URL: ${url}
HTML Content: ${truncatedHTML}

Please return a JSON response with the structure specified in the system prompt. Focus on finding high-quality tech content that would be valuable to developers and open source enthusiasts.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });
    
    const response = completion.choices[0].message.content;
    
    try {
      // Try to extract JSON from the response
      let jsonResponse = response;
      
      // If the response contains text before JSON, try to extract just the JSON part
      if (response.includes('{') && response.includes('}')) {
        const startIndex = response.indexOf('{');
        const endIndex = response.lastIndexOf('}') + 1;
        jsonResponse = response.substring(startIndex, endIndex);
      }
      
      const analysis = JSON.parse(jsonResponse);
      
      // Validate that we have the required fields and they meet length requirements
      if (!analysis.refetchTitle || !analysis.discussionStarter || typeof analysis.qualityScore !== 'number') {
        console.error(`❌ AI response missing required fields for ${url}:`, analysis);
        return null;
      }
      
      // Log title and comment lengths for monitoring (no truncation)
      if (analysis.refetchTitle.length > 60) {
        console.warn(`  - ⚠️ Title is long: ${analysis.refetchTitle.length} chars (will be handled on client side)`);
      }
      
      if (analysis.discussionStarter.length > 200) {
        console.warn(`  - ⚠️ Comment is long: ${analysis.discussionStarter.length} chars (will be handled on client side)`);
      }
      
      console.log(`✅ AI analysis completed for ${url}:`);
      console.log(`  - Title: "${analysis.refetchTitle}" (${analysis.refetchTitle.length} chars)`);
      console.log(`  - Comment: "${analysis.discussionStarter}" (${analysis.discussionStarter.length} chars)`);
      console.log(`  - Quality Score: ${analysis.qualityScore}/100`);
      
      return {
        url: url,
        analysis: analysis
      };
    } catch (parseError) {
      console.error(`❌ Error parsing AI response for ${url}:`, parseError);
      console.error(`  - Raw response:`, response.substring(0, 200) + '...');
      return null;
    }
    
  } catch (error) {
    console.error(`❌ Error analyzing HTML from ${url} with AI:`, error.message);
    return null;
  }
}

// Helper function to check for duplicate URLs
async function checkDuplicateUrl(url) {
  try {
    const cleanUrlString = cleanUrl(url);
    console.log(`  - Checking for duplicates: ${cleanUrlString}`);
    
    const existingPosts = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID || '',
      process.env.APPWRITE_POSTS_COLLECTION_ID || '',
      [Query.equal('link', cleanUrlString)]
    );
    
    const isDuplicate = existingPosts.documents.length > 0;
    if (isDuplicate) {
      console.log(`  - ⚠️ Duplicate found: ${existingPosts.documents.length} existing posts with same URL`);
    } else {
      console.log(`  - ✅ No duplicates found`);
    }
    
    return isDuplicate;
  } catch (error) {
    console.error('❌ Error checking for duplicate URL:', error);
    if (error.message.includes('not authorized')) {
      console.error('  - Database permission error - check function scopes');
    }
    return false;
  }
}

// Helper function to add article to database
async function addArticleToDatabase(article) {
  try {
    const analysis = article.analysis;
    
    console.log(`\n💾 Adding article to database: ${article.url}`);
    console.log(`  - Title: "${analysis.refetchTitle}"`);
    console.log(`  - Quality Score: ${analysis.qualityScore}/100`);
    console.log(`  - Comment Length: ${analysis.discussionStarter.length} chars`);
    
    // Check for duplicates
    const isDuplicate = await checkDuplicateUrl(article.url);
    if (isDuplicate) {
      console.log(`⏭️ Skipping duplicate: ${article.url}`);
      return { success: false, reason: 'duplicate' };
    }
    
    // Prepare document data
    const documentData = {
      title: analysis.refetchTitle || 'Untitled Article',
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
    
    console.log(`  - Creating post with data:`, {
      title: documentData.title,
      userId: documentData.userId,
      userName: documentData.userName,
      link: documentData.link
    });
    
    // Create the document
    const createdDocument = await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID || '',
      process.env.APPWRITE_POSTS_COLLECTION_ID || '',
      ID.unique(),
      documentData
    );
    
    console.log(`✅ Successfully created post: ${createdDocument.$id}`);
    
    // Create the discussion starter comment
    if (analysis.discussionStarter && analysis.discussionStarter.trim().length > 0) {
      try {
        console.log(`  - Creating discussion starter comment...`);
        console.log(`  - Comment content: "${analysis.discussionStarter}"`);
        
        const commentDocument = await databases.createDocument(
          process.env.APPWRITE_DATABASE_ID || '',
          process.env.APPWRITE_COMMENTS_COLLECTION_ID || '',
          ID.unique(),
          {
            postId: createdDocument.$id,
            userId: process.env.SCOUT_USER_ID || '',
            userName: process.env.SCOUT_USER_NAME || 'Scout',
            content: analysis.discussionStarter.trim(),
            count: 0
          }
        );
        
        console.log(`✅ Successfully created comment: ${commentDocument.$id}`);
        
        // Update the post with the comment count
        await databases.updateDocument(
          process.env.APPWRITE_DATABASE_ID || '',
          process.env.APPWRITE_POSTS_COLLECTION_ID || '',
          createdDocument.$id,
          { countComments: 1 }
        );
        
        console.log(`✅ Successfully added article with discussion starter: ${analysis.refetchTitle}`);
        console.log(`  - Post ID: ${createdDocument.$id}`);
        console.log(`  - Comment ID: ${commentDocument.$id}`);
        
      } catch (commentError) {
        console.error(`❌ Error creating discussion starter comment for ${article.url}:`, commentError);
        if (commentError.message.includes('not authorized')) {
          console.error('  - Comment creation permission error - check function scopes');
        }
        // Don't fail the post creation if comment creation fails
      }
    } else {
      console.log(`⚠️ No discussion starter provided for: ${analysis.refetchTitle}`);
    }
    
    return { success: true, documentId: createdDocument.$id };
    
  } catch (error) {
    console.error(`❌ Error adding article ${article.url} to database:`, error);
    if (error.message.includes('not authorized')) {
      console.error('  - Database permission error - check function scopes');
      return { success: false, reason: 'permission_error', error: 'Function lacks database write permissions' };
    }
    return { success: false, reason: 'database_error', error: error.message };
  }
}

// Helper function to delay between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to log URL processing status
function logUrlStatus(url, status, details = '') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const statusIcon = {
    'scraping': '🔍',
    'scraped': '✅',
    'failed_scrape': '❌',
    'analyzing': '🤖',
    'analyzed': '✅',
    'failed_analysis': '❌',
    'filtered_out': '⚠️',
    'adding': '💾',
    'added': '✅',
    'duplicate': '⏭️',
    'failed_add': '❌'
  }[status] || '❓';
  
  console.log(`[${timestamp}] ${statusIcon} ${status.toUpperCase()}: ${url}${details ? ` - ${details}` : ''}`);
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
      urlsScraped: 0,
      urlsAnalyzed: 0,
      urlsFilteredOut: 0,
      urlsFailedAnalysis: 0
    },
    failedUrls: {
      scraping: [],
      analysis: [],
      quality: [],
      database: []
    }
  };
  
  try {
    console.log('🚀 Starting scout function...');
    console.log('=' .repeat(80));
    
    // Initialize clients
    initializeClients();
    
    // Validate environment variables
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'SCOUT_USER_ID'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    // Step 1: Scrape main pages and extract article URLs
    console.log('\n📋 Step 1: Scraping main pages and extracting article URLs...');
    console.log('-'.repeat(60));
    const allArticleUrls = [];
    
    for (let i = 0; i < TARGET_WEBSITES.length; i++) {
      const url = TARGET_WEBSITES[i];
      console.log(`\n[${i + 1}/${TARGET_WEBSITES.length}] Processing website: ${url}`);
      
      const mainPageHtml = await scrapeWebsiteForArticles(url);
      if (mainPageHtml) {
        const articleUrls = extractArticleUrls(mainPageHtml, url);
        allArticleUrls.push(...articleUrls);
        results.websitesScraped++;
        results.urlBreakdown.totalUrlsFound += articleUrls.length;
      }
      
      // Delay between requests to be respectful
      await delay(parseInt(process.env.SCRAPING_DELAY_MS || '3000'));
    }
    
    console.log(`\n📊 Step 1 Summary:`);
    console.log(`  - Websites scraped: ${results.websitesScraped}/${TARGET_WEBSITES.length}`);
    console.log(`  - Total article URLs found: ${allArticleUrls.length}`);
    
    // Step 2: Scrape individual articles
    console.log('\n📄 Step 2: Scraping individual articles...');
    console.log('-'.repeat(60));
    const scrapedArticles = [];
    const maxArticlesToScrape = parseInt(process.env.MAX_ARTICLES_TO_SCRAPE || '100');
    
    console.log(`  - Will attempt to scrape up to ${maxArticlesToScrape} articles`);
    
    for (let i = 0; i < Math.min(allArticleUrls.length, maxArticlesToScrape); i++) {
      const articleUrl = allArticleUrls[i];
      console.log(`\n[${i + 1}/${Math.min(allArticleUrls.length, maxArticlesToScrape)}] Processing: ${articleUrl}`);
      
      logUrlStatus(articleUrl, 'scraping');
      const articleHtml = await scrapeArticle(articleUrl);
      if (articleHtml) {
        scrapedArticles.push({ url: articleUrl, html: articleHtml });
        results.urlBreakdown.urlsScraped++;
        logUrlStatus(articleUrl, 'scraped', `(${(articleHtml.length / 1024).toFixed(1)}KB)`);
      } else {
        results.urlBreakdown.urlsFailedAnalysis++;
        results.failedUrls.scraping.push({ url: articleUrl, reason: 'Failed to scrape HTML content' });
        logUrlStatus(articleUrl, 'failed_scrape', 'No HTML content returned');
      }
      
      // Delay between article requests
      await delay(parseInt(process.env.ARTICLE_SCRAPING_DELAY_MS || '2000'));
    }
    
    console.log(`\n📊 Step 2 Summary:`);
    console.log(`  - Articles successfully scraped: ${scrapedArticles.length}/${Math.min(allArticleUrls.length, maxArticlesToScrape)}`);
    console.log(`  - Scraping failures: ${results.urlBreakdown.urlsFailedAnalysis}`);
    
    // Step 3: Analyze individual articles with AI
    console.log('\n🤖 Step 3: Analyzing individual articles with AI...');
    console.log('-'.repeat(60));
    const analyzedArticles = [];
    
    for (let i = 0; i < scrapedArticles.length; i++) {
      const article = scrapedArticles[i];
      console.log(`\n[${i + 1}/${scrapedArticles.length}] AI Analysis: ${article.url}`);
      
      logUrlStatus(article.url, 'analyzing');
      const analyzedArticle = await analyzeHTMLWithAI(article.html, article.url);
      if (analyzedArticle) {
        analyzedArticles.push(analyzedArticle);
        results.articlesAnalyzed++;
        results.urlBreakdown.urlsAnalyzed++;
        logUrlStatus(article.url, 'analyzed', `Score: ${analyzedArticle.analysis.qualityScore}/100`);
      } else {
        results.urlBreakdown.urlsFailedAnalysis++;
        results.failedUrls.analysis.push({ url: article.url, reason: 'AI analysis failed or returned invalid data' });
        logUrlStatus(article.url, 'failed_analysis', 'AI analysis failed');
      }
      
      // Delay between AI requests
      await delay(1000);
    }
    
    console.log(`\n📊 Step 3 Summary:`);
    console.log(`  - Articles successfully analyzed: ${results.articlesAnalyzed}/${scrapedArticles.length}`);
    console.log(`  - Analysis failures: ${results.urlBreakdown.urlsFailedAnalysis}`);
    
    // Step 4: Filter and add articles to database
    console.log('\n💾 Step 4: Adding articles to database...');
    console.log('-'.repeat(60));
    
    // Sort by quality score (highest first) and take top articles
    const maxArticles = parseInt(process.env.MAX_ARTICLES_PER_RUN || '10');
    
    console.log(`  - Max articles per run: ${maxArticles}`);
    
    // Remove quality threshold - accept all articles that have required fields
    const sortedArticles = analyzedArticles
      .filter(article => article.analysis.refetchTitle && article.analysis.discussionStarter) // Only check for required fields
      .sort((a, b) => (b.analysis.qualityScore || 0) - (a.analysis.qualityScore || 0)) // Still sort by quality for better ordering
      .slice(0, maxArticles);
    
    const filteredOutCount = analyzedArticles.length - sortedArticles.length;
    results.urlBreakdown.urlsFilteredOut = filteredOutCount;
    
    // Track which URLs were filtered out and why
    const filteredOutArticles = analyzedArticles.filter(article => 
      !sortedArticles.some(sorted => sorted.url === article.url)
    );
    
    filteredOutArticles.forEach(article => {
      let reason = '';
      if (!article.analysis.refetchTitle) {
        reason = 'Missing title';
      } else if (!article.analysis.discussionStarter) {
        reason = 'Missing discussion starter';
      }
      
      results.failedUrls.quality.push({ 
        url: article.url, 
        reason: reason,
        qualityScore: article.analysis.qualityScore,
        hasTitle: !!article.analysis.refetchTitle,
        hasDiscussionStarter: !!article.analysis.discussionStarter
      });
      
      logUrlStatus(article.url, 'filtered_out', reason);
    });
    
    console.log(`\n📊 Quality Filtering Results:`);
    console.log(`  - Articles with required fields: ${sortedArticles.length}/${analyzedArticles.length}`);
    console.log(`  - Articles filtered out: ${filteredOutCount}`);
    
    if (sortedArticles.length > 0) {
      console.log(`  - Articles to process:`);
      sortedArticles.forEach((article, index) => {
        console.log(`    ${index + 1}. "${article.analysis.refetchTitle}" (Score: ${article.analysis.qualityScore || 'N/A'}/100)`);
        console.log(`       URL: ${article.url}`);
        console.log(`       Comment: "${article.analysis.discussionStarter.substring(0, 100)}${article.analysis.discussionStarter.length > 100 ? '...' : ''}"`);
      });
    } else {
      console.log(`  - ⚠️ No articles had the required fields (title + discussion starter)`);
    }
    
    for (const article of sortedArticles) {
      console.log(`\n--- Processing article: ${article.analysis.refetchTitle} ---`);
      logUrlStatus(article.url, 'adding');
      const result = await addArticleToDatabase(article);
      
      if (result.success) {
        results.articlesAdded++;
        console.log(`✅ Successfully added: ${article.analysis.refetchTitle}`);
        logUrlStatus(article.url, 'added', `Post ID: ${result.documentId}`);
      } else if (result.reason === 'duplicate') {
        results.duplicatesSkipped++;
        console.log(`⏭️ Skipped duplicate: ${article.analysis.refetchTitle}`);
        logUrlStatus(article.url, 'duplicate', 'Already exists in database');
      } else {
        results.errors.push(`Failed to add ${article.url}: ${result.reason}`);
        console.log(`❌ Failed to add: ${article.analysis.refetchTitle} - ${result.reason}`);
        results.failedUrls.database.push({ 
          url: article.url, 
          reason: result.reason,
          error: result.error || 'Unknown error'
        });
        logUrlStatus(article.url, 'failed_add', result.reason);
      }
      
      // Small delay between database operations
      await delay(500);
    }
    
    // Calculate execution time
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    results.executionTime = `${executionTime}s`;
    
    console.log('\n🎉 Scout function completed successfully!');
    console.log('=' .repeat(80));
    console.log(`\n📊 Final Results:`);
    console.log(`  - Websites scraped: ${results.websitesScraped}/${TARGET_WEBSITES.length}`);
    console.log(`  - Total URLs found: ${results.urlBreakdown.totalUrlsFound}`);
    console.log(`  - URLs successfully scraped: ${results.urlBreakdown.urlsScraped}`);
    console.log(`  - URLs successfully analyzed: ${results.urlBreakdown.urlsAnalyzed}`);
    console.log(`  - URLs filtered out (missing fields): ${results.urlBreakdown.urlsFilteredOut}`);
    console.log(`  - URLs failed analysis: ${results.urlBreakdown.urlsFailedAnalysis}`);
    console.log(`  - Articles added to database: ${results.articlesAdded}`);
    console.log(`  - Duplicates skipped: ${results.duplicatesSkipped}`);
    console.log(`  - Comments created: ${results.articlesAdded}`); // Each article gets a comment
    console.log(`  - Execution time: ${results.executionTime}`);
    
    // Log failed URLs summary
    if (results.failedUrls.scraping.length > 0 || results.failedUrls.analysis.length > 0 || 
        results.failedUrls.quality.length > 0 || results.failedUrls.database.length > 0) {
      console.log(`\n❌ Failed URLs Summary:`);
      
      if (results.failedUrls.scraping.length > 0) {
        console.log(`  - Scraping failures (${results.failedUrls.scraping.length}):`);
        results.failedUrls.scraping.slice(0, 5).forEach(failure => {
          console.log(`    • ${failure.url} - ${failure.reason}`);
        });
        if (results.failedUrls.scraping.length > 5) {
          console.log(`    ... and ${results.failedUrls.scraping.length - 5} more`);
        }
      }
      
      if (results.failedUrls.analysis.length > 0) {
        console.log(`  - AI Analysis failures (${results.failedUrls.analysis.length}):`);
        results.failedUrls.analysis.slice(0, 5).forEach(failure => {
          console.log(`    • ${failure.url} - ${failure.reason}`);
        });
        if (results.failedUrls.analysis.length > 5) {
          console.log(`    ... and ${results.failedUrls.analysis.length - 5} more`);
        }
      }
      
      if (results.failedUrls.quality.length > 0) {
        console.log(`  - Required fields filter failures (${results.failedUrls.quality.length}):`);
        results.failedUrls.quality.slice(0, 5).forEach(failure => {
          console.log(`    • ${failure.url} - ${failure.reason}`);
        });
        if (results.failedUrls.quality.length > 5) {
          console.log(`    ... and ${results.failedUrls.quality.length - 5} more`);
        }
      }
      
      if (results.failedUrls.database.length > 0) {
        console.log(`  - Database failures (${results.failedUrls.database.length}):`);
        results.failedUrls.database.slice(0, 5).forEach(failure => {
          console.log(`    • ${failure.url} - ${failure.reason}${failure.error ? ` (${failure.error})` : ''}`);
        });
        if (results.failedUrls.database.length > 5) {
          console.log(`    ... and ${results.failedUrls.database.length - 5} more`);
        }
      }
    }
    
    if (results.errors.length > 0) {
      console.log(`\n❌ Errors encountered: ${results.errors.length}`);
      results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    return {
      success: true,
      ...results
    };
    
  } catch (error) {
    console.error('❌ Scout function failed:', error);
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
    console.error('Unexpected error in scout function:', error);
    return {
      success: false,
      error: error.message,
      executionTime: '0s'
    };
  }
}

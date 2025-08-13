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

// Helper function to scrape a website's main page and extract article links with labels
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

// Helper function to extract article URLs and labels from a website's main page
function extractArticleUrlsWithLabels(html, baseUrl) {
  try {
    const articleData = [];
    
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
    
    console.log(`📊 URL Extraction Results for ${baseUrl}:`);
    console.log(`  - Raw URLs found: ${processedUrls}`);
    console.log(`  - Skipped due to filtering: ${skippedUrls}`);
    console.log(`  - After deduplication and filtering: ${finalArticles.length}`);
    
    // Log a few sample URLs for debugging
    if (finalArticles.length > 0) {
      console.log(`  - Sample articles:`);
      finalArticles.slice(0, 3).forEach(article => {
        console.log(`    • "${article.label}" -> ${article.url}`);
      });
    } else {
      console.log(`  - ⚠️ No valid article URLs found for ${baseUrl}`);
    }
    
    return finalArticles;
    
  } catch (error) {
    console.error(`❌ Error extracting article URLs from ${baseUrl}:`, error.message);
    return [];
  }
}

// Helper function to analyze URLs with AI in batches
async function analyzeUrlsWithAI(urlsWithLabels, sourceUrl) {
  try {
    console.log(`\n🤖 Analyzing ${urlsWithLabels.length} URLs from ${sourceUrl} with AI...`);
    
    // Prepare the data for AI analysis
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
      // Try to extract JSON from the response
      let jsonResponse = response;
      
      // If the response contains text before JSON, try to extract just the JSON part
      if (response.includes('{') && response.includes('}')) {
        const startIndex = response.indexOf('{');
        const endIndex = response.lastIndexOf('}') + 1;
        jsonResponse = response.substring(startIndex, endIndex);
      }
      
      const analysis = JSON.parse(jsonResponse);
      
      // Validate that we have the required structure
      if (!analysis.articles || !Array.isArray(analysis.articles)) {
        console.error(`❌ AI response missing articles array for ${sourceUrl}:`, analysis);
        return [];
      }
      
      // Validate each article has required fields
      const validArticles = analysis.articles.filter(article => {
        if (!article.url || !article.refetchTitle || !article.discussionStarter) {
          console.warn(`  - ⚠️ Skipping article with missing fields:`, article);
          return false;
        }
        return true;
      });
      
      console.log(`✅ AI analysis completed for ${sourceUrl}:`);
      console.log(`  - Articles returned: ${analysis.articles.length}`);
      console.log(`  - Valid articles: ${validArticles.length}`);
      
      // Log sample articles
      if (validArticles.length > 0) {
        console.log(`  - Sample articles:`);
        validArticles.slice(0, 3).forEach(article => {
          console.log(`    • "${article.refetchTitle}"`);
          console.log(`      URL: ${article.url}`);
          console.log(`      Comment: "${article.discussionStarter.substring(0, 100)}${article.discussionStarter.length > 100 ? '...' : ''}"`);
        });
      }
      
      return validArticles;
      
    } catch (parseError) {
      console.error(`❌ Error parsing AI response for ${sourceUrl}:`, parseError);
      console.error(`  - Raw response:`, response.substring(0, 200) + '...');
      return [];
    }
    
  } catch (error) {
    console.error(`❌ Error analyzing URLs from ${sourceUrl} with AI:`, error.message);
    return [];
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
    console.log(`\n💾 Adding article to database: ${article.url}`);
    console.log(`  - Title: "${article.refetchTitle}"`);
    console.log(`  - Comment Length: ${article.discussionStarter.length} chars`);
    
    // Check for duplicates
    const isDuplicate = await checkDuplicateUrl(article.url);
    if (isDuplicate) {
      console.log(`⏭️ Skipping duplicate: ${article.url}`);
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
    if (article.discussionStarter && article.discussionStarter.trim().length > 0) {
      try {
        console.log(`  - Creating discussion starter comment...`);
        console.log(`  - Comment content: "${article.discussionStarter}"`);
        
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
        
        console.log(`✅ Successfully created comment: ${commentDocument.$id}`);
        
        // Update the post with the comment count
        await databases.updateDocument(
          process.env.APPWRITE_DATABASE_ID || '',
          process.env.APPWRITE_POSTS_COLLECTION_ID || '',
          createdDocument.$id,
          { countComments: 1 }
        );
        
        console.log(`✅ Successfully added article with discussion starter: ${article.refetchTitle}`);
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
      console.log(`⚠️ No discussion starter provided for: ${article.refetchTitle}`);
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
    'analyzing': '🤖',
    'analyzed': '✅',
    'failed_analysis': '❌',
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
    
    // Step 1: Scrape main pages and extract article URLs with labels
    console.log('\n📋 Step 1: Scraping main pages and extracting article URLs with labels...');
    console.log('-'.repeat(60));
    const allArticlesData = [];
    
    for (let i = 0; i < TARGET_WEBSITES.length; i++) {
      const url = TARGET_WEBSITES[i];
      console.log(`\n[${i + 1}/${TARGET_WEBSITES.length}] Processing website: ${url}`);
      
      const mainPageHtml = await scrapeWebsiteForArticles(url);
      if (mainPageHtml) {
        const articlesData = extractArticleUrlsWithLabels(mainPageHtml, url);
        allArticlesData.push(...articlesData);
        results.websitesScraped++;
        results.urlBreakdown.totalUrlsFound += articlesData.length;
      }
      
      // Delay between requests to be respectful
      await delay(parseInt(process.env.SCRAPING_DELAY_MS || '3000'));
    }
    
    console.log(`\n📊 Step 1 Summary:`);
    console.log(`  - Websites scraped: ${results.websitesScraped}/${TARGET_WEBSITES.length}`);
    console.log(`  - Total article URLs found: ${allArticlesData.length}`);
    
    // Step 2: Analyze URLs with AI in batches
    console.log('\n🤖 Step 2: Analyzing URLs with AI in batches...');
    console.log('-'.repeat(60));
    const analyzedArticles = [];
    
    // Process each website's URLs separately to get better context
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
      
      console.log(`\n[${i + 1}/${TARGET_WEBSITES.length}] AI Analysis for: ${sourceUrl}`);
      console.log(`  - URLs to analyze: ${sourceArticles.length}`);
      
      const analyzedSourceArticles = await analyzeUrlsWithAI(sourceArticles, sourceUrl);
      analyzedArticles.push(...analyzedSourceArticles);
      results.urlBreakdown.urlsAnalyzed += analyzedSourceArticles.length;
      
      // Delay between AI requests
      await delay(2000);
    }
    
    console.log(`\n📊 Step 2 Summary:`);
    console.log(`  - Articles successfully analyzed: ${analyzedArticles.length}/${allArticlesData.length}`);
    console.log(`  - Analysis failures: ${results.urlBreakdown.totalUrlsFound - results.urlBreakdown.urlsAnalyzed}`);
    
    // Step 3: Add articles to database
    console.log('\n💾 Step 3: Adding articles to database...');
    console.log('-'.repeat(60));
    
    // Limit the number of articles to add per run
    const maxArticles = parseInt(process.env.MAX_ARTICLES_PER_RUN || '20');
    const articlesToProcess = analyzedArticles.slice(0, maxArticles);
    
    console.log(`  - Max articles per run: ${maxArticles}`);
    console.log(`  - Articles to process: ${articlesToProcess.length}`);
    
    if (articlesToProcess.length > 0) {
      console.log(`  - Articles to process:`);
      articlesToProcess.forEach((article, index) => {
        console.log(`    ${index + 1}. "${article.refetchTitle}"`);
        console.log(`       URL: ${article.url}`);
        console.log(`       Comment: "${article.discussionStarter.substring(0, 100)}${article.discussionStarter.length > 100 ? '...' : ''}"`);
      });
    } else {
      console.log(`  - ⚠️ No articles were successfully analyzed`);
    }
    
    for (const article of articlesToProcess) {
      console.log(`\n--- Processing article: ${article.refetchTitle} ---`);
      logUrlStatus(article.url, 'adding');
      const result = await addArticleToDatabase(article);
      
      if (result.success) {
        results.articlesAdded++;
        console.log(`✅ Successfully added: ${article.refetchTitle}`);
        logUrlStatus(article.url, 'added', `Post ID: ${result.documentId}`);
      } else if (result.reason === 'duplicate') {
        results.duplicatesSkipped++;
        console.log(`⏭️ Skipped duplicate: ${article.refetchTitle}`);
        logUrlStatus(article.url, 'duplicate', 'Already exists in database');
      } else {
        results.errors.push(`Failed to add ${article.url}: ${result.reason}`);
        console.log(`❌ Failed to add: ${article.refetchTitle} - ${result.reason}`);
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
    console.log(`  - URLs successfully analyzed: ${results.urlBreakdown.urlsAnalyzed}`);
    console.log(`  - Articles added to database: ${results.articlesAdded}`);
    console.log(`  - Duplicates skipped: ${results.duplicatesSkipped}`);
    console.log(`  - Comments created: ${results.articlesAdded}`); // Each article gets a comment
    console.log(`  - Execution time: ${results.executionTime}`);
    
    // Log failed URLs summary
    if (results.failedUrls.analysis.length > 0 || results.failedUrls.database.length > 0) {
      console.log(`\n❌ Failed URLs Summary:`);
      
      if (results.failedUrls.analysis.length > 0) {
        console.log(`  - AI Analysis failures (${results.failedUrls.analysis.length}):`);
        results.failedUrls.analysis.slice(0, 5).forEach(failure => {
          console.log(`    • ${failure.url} - ${failure.reason}`);
        });
        if (results.failedUrls.analysis.length > 5) {
          console.log(`    ... and ${results.failedUrls.analysis.length - 5} more`);
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

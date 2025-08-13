/**
 * Scout Appwrite Function
 * 
 * This function automatically scouts tech websites for high-quality articles,
 * analyzes them using AI, and adds the best ones to your refetch database.
 */

import { Client, Databases, ID, Query } from 'node-appwrite';
import OpenAI from 'openai';
import axios from 'axios';

// Target websites to scout
const TARGET_WEBSITES = [
  "https://techcrunch.com",
  "https://theverge.com", 
  "https://arstechnica.com",
  "https://wired.com",
  "https://venturebeat.com",
  "https://infoq.com",
  "https://theregister.com"
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
    console.log(`Scraping ${url} for article links...`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    if (response.status === 200) {
      console.log(`Successfully scraped ${url} for article links`);
      return response.data;
    } else {
      console.error(`Failed to scrape ${url}: HTTP ${response.status}`);
      return null;
    }
    
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return null;
  }
}

// Helper function to extract article URLs from a website's main page
function extractArticleUrls(html, baseUrl) {
  try {
    const articleUrls = [];
    
    // Site-specific extraction patterns
    if (baseUrl.includes('techcrunch.com')) {
      // TechCrunch specific patterns
      const techcrunchPatterns = [
        /href=["']([^"']*\/\d{4}\/\d{2}\/[^"']*)["']/gi,
        /href=["']([^"']*\/tag\/[^"']*)["']/gi,
        /href=["']([^"']*\/author\/[^"']*)["']/gi
      ];
      
      for (const pattern of techcrunchPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          let articleUrl = match[1];
          if (articleUrl.startsWith('/')) {
            articleUrl = new URL(articleUrl, baseUrl).href;
          }
          
          // Filter out non-article URLs
          if (articleUrl.startsWith(baseUrl) && 
              !articleUrl.includes('wp-content') &&
              !articleUrl.includes('wp-includes') &&
              !articleUrl.includes('_static') &&
              !articleUrl.includes('.css') &&
              !articleUrl.includes('.js') &&
              !articleUrl.includes('.png') &&
              !articleUrl.includes('.jpg') &&
              !articleUrl.includes('.gif') &&
              !articleUrl.includes('.ico') &&
              !articleUrl.includes('#') &&
              !articleUrl.includes('javascript:') &&
              articleUrl !== baseUrl &&
              !articleUrl.endsWith('/')) {
            articleUrls.push(articleUrl);
          }
        }
      }
    } else if (baseUrl.includes('arstechnica.com')) {
      // Ars Technica specific patterns
      const arsPatterns = [
        /href=["']([^"']*\/\d{4}\/\d{2}\/[^"']*)["']/gi,
        /href=["']([^"']*\/category\/[^"']*)["']/gi,
        /href=["']([^"']*\/tag\/[^"']*)["']/gi
      ];
      
      for (const pattern of arsPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          let articleUrl = match[1];
          if (articleUrl.startsWith('/')) {
            articleUrl = new URL(articleUrl, baseUrl).href;
          }
          
          if (articleUrl.startsWith(baseUrl) && 
              !articleUrl.includes('.css') &&
              !articleUrl.includes('.js') &&
              !articleUrl.includes('.png') &&
              !articleUrl.includes('.jpg') &&
              !articleUrl.includes('#') &&
              !articleUrl.includes('javascript:') &&
              articleUrl !== baseUrl &&
              !articleUrl.endsWith('/')) {
            articleUrls.push(articleUrl);
          }
        }
      }
    } else if (baseUrl.includes('wired.com')) {
      // Wired specific patterns
      const wiredPatterns = [
        /href=["']([^"']*\/story\/[^"']*)["']/gi,
        /href=["']([^"']*\/\d{4}\/\d{2}\/[^"']*)["']/gi
      ];
      
      for (const pattern of wiredPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          let articleUrl = match[1];
          if (articleUrl.startsWith('/')) {
            articleUrl = new URL(articleUrl, baseUrl).href;
          }
          
          if (articleUrl.startsWith(baseUrl) && 
              !articleUrl.includes('.css') &&
              !articleUrl.includes('.js') &&
              !articleUrl.includes('.png') &&
              !articleUrl.includes('.jpg') &&
              !articleUrl.includes('#') &&
              !articleUrl.includes('javascript:') &&
              articleUrl !== baseUrl &&
              !articleUrl.endsWith('/')) {
            articleUrls.push(articleUrl);
          }
        }
      }
    } else if (baseUrl.includes('venturebeat.com')) {
      // VentureBeat specific patterns
      const vbPatterns = [
        /href=["']([^"']*\/\d{4}\/\d{2}\/[^"']*)["']/gi,
        /href=["']([^"']*\/category\/[^"']*)["']/gi
      ];
      
      for (const pattern of vbPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          let articleUrl = match[1];
          if (articleUrl.startsWith('/')) {
            articleUrl = new URL(articleUrl, baseUrl).href;
          }
          
          if (articleUrl.startsWith(baseUrl) && 
              !articleUrl.includes('.css') &&
              !articleUrl.includes('.js') &&
              !articleUrl.includes('.png') &&
              !articleUrl.includes('.jpg') &&
              !articleUrl.includes('#') &&
              !articleUrl.includes('javascript:') &&
              articleUrl !== baseUrl &&
              !articleUrl.endsWith('/')) {
            articleUrls.push(articleUrl);
          }
        }
      }
    } else if (baseUrl.includes('infoq.com')) {
      // InfoQ specific patterns
      const infoqPatterns = [
        /href=["']([^"']*\/news\/[^"']*)["']/gi,
        /href=["']([^"']*\/presentation\/[^"']*)["']/gi,
        /href=["']([^"']*\/article\/[^"']*)["']/gi
      ];
      
      for (const pattern of infoqPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          let articleUrl = match[1];
          if (articleUrl.startsWith('/')) {
            articleUrl = new URL(articleUrl, baseUrl).href;
          }
          
          if (articleUrl.startsWith(baseUrl) && 
              !articleUrl.includes('.css') &&
              !articleUrl.includes('.js') &&
              !articleUrl.includes('.png') &&
              !articleUrl.includes('.jpg') &&
              !articleUrl.includes('#') &&
              !articleUrl.includes('javascript:') &&
              articleUrl !== baseUrl &&
              !articleUrl.endsWith('/')) {
            articleUrls.push(articleUrl);
          }
        }
      }
    } else if (baseUrl.includes('theregister.com')) {
      // The Register specific patterns
      const regPatterns = [
        /href=["']([^"']*\/\d{4}\/\d{2}\/[^"']*)["']/gi,
        /href=["']([^"']*\/article\/[^"']*)["']/gi
      ];
      
      for (const pattern of regPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          let articleUrl = match[1];
          if (articleUrl.startsWith('/')) {
            articleUrl = new URL(articleUrl, baseUrl).href;
          }
          
          if (articleUrl.startsWith(baseUrl) && 
              !articleUrl.includes('.css') &&
              !articleUrl.includes('.js') &&
              !articleUrl.includes('.png') &&
              !articleUrl.includes('.jpg') &&
              !articleUrl.includes('#') &&
              !articleUrl.includes('javascript:') &&
              articleUrl !== baseUrl &&
              !articleUrl.endsWith('/')) {
            articleUrls.push(articleUrl);
          }
        }
      }
    } else {
      // Generic patterns for other sites
      const genericPatterns = [
        /href=["']([^"']*\/\d{4}\/\d{2}\/[^"']*)["']/gi,
        /href=["']([^"']*\/article\/[^"']*)["']/gi,
        /href=["']([^"']*\/story\/[^"']*)["']/gi,
        /href=["']([^"']*\/news\/[^"']*)["']/gi
      ];
      
      for (const pattern of genericPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          let articleUrl = match[1];
          if (articleUrl.startsWith('/')) {
            articleUrl = new URL(articleUrl, baseUrl).href;
          }
          
          if (articleUrl.startsWith(baseUrl) && 
              !articleUrl.includes('.css') &&
              !articleUrl.includes('.js') &&
              !articleUrl.includes('.png') &&
              !articleUrl.includes('.jpg') &&
              !articleUrl.includes('#') &&
              !articleUrl.includes('javascript:') &&
              articleUrl !== baseUrl &&
              !articleUrl.endsWith('/')) {
            articleUrls.push(articleUrl);
          }
        }
      }
    }
    
    // Remove duplicates and limit to reasonable number
    const uniqueUrls = [...new Set(articleUrls)].slice(0, 20);
    
    // Additional filtering to ensure we have good URLs
    const filteredUrls = uniqueUrls.filter(url => {
      // Skip URLs that are clearly not articles
      const skipPatterns = [
        /\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i,
        /wp-content\/uploads/i,
        /wp-includes/i,
        /_static/i,
        /feed/i,
        /rss/i,
        /sitemap/i,
        /robots\.txt/i,
        /favicon/i
      ];
      
      return !skipPatterns.some(pattern => pattern.test(url));
    });
    
    console.log(`Found ${uniqueUrls.length} potential article URLs from ${baseUrl}`);
    console.log(`After filtering: ${filteredUrls.length} valid article URLs`);
    
    // Log a few sample URLs for debugging
    if (filteredUrls.length > 0) {
      console.log(`Sample URLs: ${filteredUrls.slice(0, 3).join(', ')}`);
    }
    
    return filteredUrls;
    
  } catch (error) {
    console.error(`Error extracting article URLs from ${baseUrl}:`, error.message);
    return [];
  }
}

// Helper function to scrape an individual article and get its content
async function scrapeArticle(url) {
  try {
    console.log(`Scraping article: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    if (response.status === 200) {
      console.log(`Successfully scraped article: ${url}`);
      return response.data;
    } else {
      console.error(`Failed to scrape article ${url}: HTTP ${response.status}`);
      return null;
    }
    
  } catch (error) {
    console.error(`Error scraping article ${url}:`, error.message);
    return null;
  }
}

// Helper function to analyze HTML with AI
async function analyzeHTMLWithAI(html, url) {
  try {
    console.log(`Analyzing HTML from ${url}...`);
    
    // Truncate HTML if it's too long for the AI
    const maxLength = 6000; // Reduced to avoid token limit issues
    const truncatedHTML = html.length > maxLength ? html.substring(0, maxLength) + '...' : html;
    
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
        console.error(`AI response missing required fields for ${url}:`, analysis);
        return null;
      }
      
      // Log title and comment lengths for monitoring (no truncation)
      if (analysis.refetchTitle.length > 60) {
        console.warn(`Title is long for ${url}: ${analysis.refetchTitle.length} chars (will be handled on client side)`);
      }
      
      if (analysis.discussionStarter.length > 200) {
        console.warn(`Comment is long for ${url}: ${analysis.discussionStarter.length} chars (will be handled on client side)`);
      }
      
      console.log(`AI analysis validated for ${url}:`);
      console.log(`- Title: "${analysis.refetchTitle}" (${analysis.refetchTitle.length} chars)`);
      console.log(`- Comment: "${analysis.discussionStarter}" (${analysis.discussionStarter.length} chars)`);
      console.log(`- Quality Score: ${analysis.qualityScore}`);
      
      return {
        url: url,
        analysis: analysis
      };
    } catch (parseError) {
      console.error(`Error parsing AI response for ${url}:`, parseError);
      console.error(`Raw response:`, response.substring(0, 200) + '...');
      return null;
    }
    
  } catch (error) {
    console.error(`Error analyzing HTML from ${url} with AI:`, error.message);
    return null;
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
    console.error('Error checking for duplicate URL:', error);
    if (error.message.includes('not authorized')) {
      console.error('Database permission error - check function scopes');
    }
    return false;
  }
}

// Helper function to add article to database
async function addArticleToDatabase(article) {
  try {
    const analysis = article.analysis;
    
    // Check for duplicates
    const isDuplicate = await checkDuplicateUrl(article.url);
    if (isDuplicate) {
      console.log(`Skipping duplicate: ${article.url}`);
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
    
    // Create the document
    const createdDocument = await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID || '',
      process.env.APPWRITE_POSTS_COLLECTION_ID || '',
      ID.unique(),
      documentData
    );
    
    console.log(`Successfully created post: ${createdDocument.$id}`);
    
    // Create the discussion starter comment
    if (analysis.discussionStarter && analysis.discussionStarter.trim().length > 0) {
      try {
        console.log(`Creating discussion starter comment for: ${analysis.refetchTitle}`);
        console.log(`Comment content: "${analysis.discussionStarter}"`);
        
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
        
        console.log(`Successfully created comment: ${commentDocument.$id}`);
        
        // Update the post with the comment count
        await databases.updateDocument(
          process.env.APPWRITE_DATABASE_ID || '',
          process.env.APPWRITE_POSTS_COLLECTION_ID || '',
          createdDocument.$id,
          { countComments: 1 }
        );
        
        console.log(`Successfully added article with discussion starter: ${analysis.refetchTitle}`);
        console.log(`Post ID: ${createdDocument.$id}, Comment ID: ${commentDocument.$id}`);
        
      } catch (commentError) {
        console.error(`Error creating discussion starter comment for ${article.url}:`, commentError);
        if (commentError.message.includes('not authorized')) {
          console.error('Comment creation permission error - check function scopes');
        }
        // Don't fail the post creation if comment creation fails
      }
    } else {
      console.log(`No discussion starter provided for: ${analysis.refetchTitle}`);
    }
    
    return { success: true, documentId: createdDocument.$id };
    
  } catch (error) {
    console.error(`Error adding article ${article.url} to database:`, error);
    if (error.message.includes('not authorized')) {
      console.error('Database permission error - check function scopes');
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
    executionTime: ''
  };
  
  try {
    console.log('Starting scout function...');
    
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
    console.log('Step 1: Scraping main pages and extracting article URLs...');
    const allArticleUrls = [];
    
    for (const url of TARGET_WEBSITES) {
      const mainPageHtml = await scrapeWebsiteForArticles(url);
      if (mainPageHtml) {
        const articleUrls = extractArticleUrls(mainPageHtml, url);
        allArticleUrls.push(...articleUrls);
        results.websitesScraped++;
      }
      
      // Delay between requests to be respectful
      await delay(parseInt(process.env.SCRAPING_DELAY_MS || '3000'));
    }
    
    console.log(`Found ${allArticleUrls.length} total article URLs from ${results.websitesScraped} websites`);
    
    // Step 2: Scrape individual articles
    console.log('Step 2: Scraping individual articles...');
    const scrapedArticles = [];
    const maxArticlesToScrape = parseInt(process.env.MAX_ARTICLES_TO_SCRAPE || '30');
    
    for (let i = 0; i < Math.min(allArticleUrls.length, maxArticlesToScrape); i++) {
      const articleUrl = allArticleUrls[i];
      const articleHtml = await scrapeArticle(articleUrl);
      if (articleHtml) {
        scrapedArticles.push({ url: articleUrl, html: articleHtml });
      }
      
      // Delay between article requests
      await delay(parseInt(process.env.ARTICLE_SCRAPING_DELAY_MS || '2000'));
    }
    
    console.log(`Successfully scraped ${scrapedArticles.length} individual articles`);
    
    // Step 3: Analyze individual articles with AI
    console.log('Step 3: Analyzing individual articles with AI...');
    const analyzedArticles = [];
    
    for (const article of scrapedArticles) {
      const analyzedArticle = await analyzeHTMLWithAI(article.html, article.url);
      if (analyzedArticle) {
        analyzedArticles.push(analyzedArticle);
        results.articlesAnalyzed++;
      }
      
      // Delay between AI requests
      await delay(1000);
    }
    
    console.log(`Successfully analyzed ${results.articlesAnalyzed} individual articles`);
    
    // Step 4: Filter and add articles to database
    console.log('Step 4: Adding articles to database...');
    
    // Sort by quality score (highest first) and take top articles
    const maxArticles = parseInt(process.env.MAX_ARTICLES_PER_RUN || '10');
    const sortedArticles = analyzedArticles
      .filter(article => (article.analysis.qualityScore || 0) >= 60 && article.analysis.refetchTitle && article.analysis.discussionStarter) // Basic quality filter
      .sort((a, b) => (b.analysis.qualityScore || 0) - (a.analysis.qualityScore || 0))
      .slice(0, maxArticles);
    
    console.log(`Filtered to ${sortedArticles.length} high-quality articles (quality score >= 60)`);
    console.log(`Articles to process: ${sortedArticles.map(a => a.analysis.refetchTitle).join(', ')}`);
    
    for (const article of sortedArticles) {
      console.log(`\n--- Processing article: ${article.analysis.refetchTitle} ---`);
      const result = await addArticleToDatabase(article);
      
      if (result.success) {
        results.articlesAdded++;
        console.log(`✅ Successfully added: ${article.analysis.refetchTitle}`);
      } else if (result.reason === 'duplicate') {
        results.duplicatesSkipped++;
        console.log(`⏭️ Skipped duplicate: ${article.analysis.refetchTitle}`);
      } else {
        results.errors.push(`Failed to add ${article.url}: ${result.reason}`);
        console.log(`❌ Failed to add: ${article.analysis.refetchTitle} - ${result.reason}`);
      }
      
      // Small delay between database operations
      await delay(500);
    }
    
    // Calculate execution time
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    results.executionTime = `${executionTime}s`;
    
    console.log('Scout function completed successfully!');
    console.log(`\n📊 Final Results:`);
    console.log(`- Websites scraped: ${results.websitesScraped}`);
    console.log(`- Articles analyzed: ${results.articlesAnalyzed}`);
    console.log(`- Articles added to database: ${results.articlesAdded}`);
    console.log(`- Duplicates skipped: ${results.duplicatesSkipped}`);
    console.log(`- Comments created: ${results.articlesAdded}`); // Each article gets a comment
    console.log(`- Execution time: ${results.executionTime}`);
    
    if (results.errors.length > 0) {
      console.log(`\n❌ Errors encountered: ${results.errors.length}`);
      results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    return {
      success: true,
      ...results
    };
    
  } catch (error) {
    console.error('Scout function failed:', error);
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

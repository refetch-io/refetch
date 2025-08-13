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

Analyze the provided HTML content and return a JSON response with the following structure:

{
  "refetchTitle": "A title that feels like refetch style - similar to HN but focused on open source alternatives, tech discussions, and developer interests. Should be clear, informative, and engaging without being clickbait.",
  "discussionStarter": "A short, engaging comment (2-3 sentences) that will kick off a good discussion. Should highlight the key points, ask a thought-provoking question, or share an interesting perspective that will get developers talking.",
}

CRITICAL GUIDELINES:
- The "type" field MUST be either "link" or "show"
  * "show" = Product launches, company announcements, new features, showcases, demos, "announcing", "launching", "introducing", "new release", "now available", "beta", "alpha", "preview", "open source alternative", "competitor to", "replacement for"
  * "link" = General tech news, industry updates, analysis, reviews, tutorials, guides, discussions, controversies, research findings, acquisitions, mergers, business deals, company sales, investment rounds, funding announcements
- "refetchTitle" should be in the style of Hacker News titles - clear, informative, and developer-focused
- "discussionStarter" should be the kind of comment that would start a good conversation on HN or refetch
- Focus on content that would be valuable to developers, open source enthusiasts, and tech professionals
- Quality score should reflect how well the content fits the refetch community's interests
- Look for articles with substantial content, not just headlines or minimal text`;

// Initialize clients
let appwriteClient, databases, openai;

// Helper function to initialize clients
function initializeClients() {
  if (!appwriteClient) {
    appwriteClient = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || '');
    
    databases = new Databases(appwriteClient);
  }
  
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
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

// Helper function to scrape a website and get HTML
async function scrapeWebsite(url) {
  try {
    console.log(`Scraping ${url}...`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    if (response.status === 200) {
      console.log(`Successfully scraped ${url}`);
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

// Helper function to analyze HTML with AI
async function analyzeHTMLWithAI(html, url) {
  try {
    console.log(`Analyzing HTML from ${url}...`);
    
    // Truncate HTML if it's too long for the AI
    const maxLength = 8000;
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
      const analysis = JSON.parse(response);
      return {
        url: url,
        analysis: analysis
      };
    } catch (parseError) {
      console.error(`Error parsing AI response for ${url}:`, parseError);
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
    if (analysis.discussionStarter) {
      try {
        await databases.createDocument(
          process.env.APPWRITE_DATABASE_ID || '',
          process.env.APPWRITE_COMMENTS_COLLECTION_ID || '',
          ID.unique(),
          {
            postId: createdDocument.$id,
            userId: process.env.SCOUT_USER_ID || '',
            userName: process.env.SCOUT_USER_NAME || 'Scout',
            content: analysis.discussionStarter,
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
        
        console.log(`Successfully added article with discussion starter: ${analysis.refetchTitle}`);
      } catch (commentError) {
        console.error(`Error creating discussion starter comment for ${article.url}:`, commentError);
        // Don't fail the post creation if comment creation fails
      }
    }
    
    return { success: true, documentId: createdDocument.$id };
    
  } catch (error) {
    console.error(`Error adding article ${article.url} to database:`, error);
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
      'APPWRITE_ENDPOINT',
      'APPWRITE_PROJECT_ID', 
      'APPWRITE_API_KEY',
      'APPWRITE_DATABASE_ID',
      'APPWRITE_POSTS_COLLECTION_ID',
      'APPWRITE_COMMENTS_COLLECTION_ID',
      'OPENAI_API_KEY',
      'SCOUT_USER_ID'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    // Step 1: Scrape all websites
    console.log('Step 1: Scraping websites...');
    const scrapedData = [];
    
    for (const url of TARGET_WEBSITES) {
      const html = await scrapeWebsite(url);
      if (html) {
        scrapedData.push({ url, html });
        results.websitesScraped++;
      }
      
      // Delay between requests to be respectful
      await delay(parseInt(process.env.SCRAPING_DELAY_MS || '3000'));
    }
    
    console.log(`Successfully scraped ${results.websitesScraped} websites`);
    
    // Step 2: Analyze HTML with AI
    console.log('Step 2: Analyzing content with AI...');
    const analyzedArticles = [];
    
    for (const data of scrapedData) {
      const analyzedArticle = await analyzeHTMLWithAI(data.html, data.url);
      if (analyzedArticle) {
        analyzedArticles.push(analyzedArticle);
        results.articlesAnalyzed++;
      }
      
      // Delay between AI requests
      await delay(1000);
    }
    
    console.log(`Successfully analyzed ${results.articlesAnalyzed} websites`);
    
    // Step 3: Filter and add articles to database
    console.log('Step 3: Adding articles to database...');
    
    // Sort by quality score (highest first) and take top articles
    const maxArticles = parseInt(process.env.MAX_ARTICLES_PER_RUN || '10');
    const sortedArticles = analyzedArticles
      .filter(article => article.analysis.qualityScore >= 60) // Basic quality filter
      .sort((a, b) => b.analysis.qualityScore - a.analysis.qualityScore)
      .slice(0, maxArticles);
    
    for (const article of sortedArticles) {
      const result = await addArticleToDatabase(article);
      
      if (result.success) {
        results.articlesAdded++;
      } else if (result.reason === 'duplicate') {
        results.duplicatesSkipped++;
      } else {
        results.errors.push(`Failed to add ${article.url}: ${result.reason}`);
      }
      
      // Small delay between database operations
      await delay(500);
    }
    
    // Calculate execution time
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    results.executionTime = `${executionTime}s`;
    
    console.log('Scout function completed successfully!');
    console.log('Results:', results);
    
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
export default async function (req, res) {
  try {
    console.log('Scout function invoked');
    
    // Run the scout function
    const result = await scoutArticles();
    
    // Return the result
    return res.json(result);
    
  } catch (error) {
    console.error('Unexpected error in scout function:', error);
    return res.json({
      success: false,
      error: error.message,
      executionTime: '0s'
    });
  }
}

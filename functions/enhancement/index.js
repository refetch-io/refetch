/**
 * Enhancement Appwrite Function
 * 
 * This function fetches posts from the posts collection, enhances them with AI metadata
 * using the same system prompt as the post submission script, and updates them back to the database.
 */

import { Client, Databases, Query } from 'node-appwrite';
import OpenAI from 'openai';
import { JSDOM } from 'jsdom';

export default async function ({ req, res, log, error }) {
    try {
        log('Enhancement function started');
        
        // Initialize Appwrite client
        const client = new Client()
            .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
            .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
            .setKey(process.env.APPWRITE_API_KEY || '');
        
        const databases = new Databases(client);
        
        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        
        // Database and collection IDs
        const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '';
        const COLLECTION_ID = process.env.APPWRITE_POSTS_COLLECTION_ID || '';
        
        if (!DATABASE_ID || !COLLECTION_ID) {
            throw new Error('Missing database or collection ID in environment variables');
        }
        
        log('Fetching posts from Appwrite...');
        
        // Fetch all posts from the collection
        const postsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [
                Query.limit(1) // Process up to 100 posts at a time
            ]
        );
        
        const posts = postsResponse.documents;
        log(`Found ${posts.length} posts to enhance`);
        
        let processedCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        
        // Process each post
        for (const post of posts) {
            try {
                log(`Processing post: ${post.$id} - "${post.title}"`);
                
                // Check if post already has enhanced metadata
                if (post.metadata && post.metadata.enhanced) {
                    log(`Post ${post.$id} already enhanced, skipping`);
                    processedCount++;
                    continue;
                }
                
                // Prepare post data for AI analysis
                const postData = {
                    title: post.title || '',
                    description: post.description || '',
                    url: post.link || '',
                    type: post.type || 'link',
                    company: post.company || '',
                    location: post.location || '',
                    salary: post.salary || ''
                };
                
                // Fetch URL content if available
                let urlContent = null;
                if (postData.url && postData.type === 'link') {
                    try {
                        log(`Fetching URL content for: ${postData.url}`);
                        urlContent = await fetchURLContent(postData.url);
                    } catch (urlError) {
                        log(`Failed to fetch URL content: ${urlError.message}`);
                        // Continue without URL content
                    }
                }
                
                // Analyze post with AI
                log(`Analyzing post ${post.$id} with OpenAI...`);
                const metadata = await analyzePostWithAI(openai, postData, urlContent);
                
                // Update post with enhanced metadata
                const updateData = {
                    metadata: {
                        ...metadata,
                        enhanced: true,
                        enhancedAt: new Date().toISOString()
                    }
                };
                
                // await databases.updateDocument(
                //     DATABASE_ID,
                //     COLLECTION_ID,
                //     post.$id,
                //     updateData
                // );
                log('skipping update');
                log(`Successfully updated post ${post.$id} with enhanced metadata`);
                updatedCount++;
                
                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (postError) {
                error(`Error processing post ${post.$id}: ${postError.message}`);
                errorCount++;
            }
            
            processedCount++;
        }
        
        const result = {
            message: 'Enhancement process completed',
            timestamp: new Date().toISOString(),
            function: 'enhancement',
            status: 'success',
            summary: {
                totalPosts: posts.length,
                processed: processedCount,
                updated: updatedCount,
                errors: errorCount
            }
        };
        
        log(`Enhancement completed. ${updatedCount} posts updated, ${errorCount} errors`);
        return res.json(result);
        
    } catch (err) {
        error(`Error in Enhancement function: ${err.message}`);
        return res.json({
            message: 'Error occurred in enhancement function',
            error: err.message,
            status: 'error',
            timestamp: new Date().toISOString()
        }, 500);
    }
}

/**
 * Fetch and parse URL content for analysis
 */
async function fetchURLContent(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; RefetchBot/1.0; +https://refetch.com)',
            },
            timeout: 10000, // 10 second timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        
        // Parse HTML content for metadata extraction
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Extract title
        const title = document.querySelector('title')?.textContent?.trim() || '';
        
        // Extract meta description
        const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        
        // Extract main content
        let content = '';
        const article = document.querySelector('article') || document.querySelector('[role="main"]') || document.querySelector('main');
        if (article) {
            content = article.textContent || '';
        } else {
            const body = document.querySelector('body');
            if (body) {
                const scripts = body.querySelectorAll('script, style, nav, header, footer, aside');
                scripts.forEach(el => el.remove());
                content = body.textContent || '';
            }
        }

        // Clean content
        content = content
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 5000); // Limit to first 5000 characters

        // Calculate reading time (average reading speed: 225 words per minute)
        const wordCount = content.split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / 225);

        return {
            title,
            description: metaDescription,
            content,
            wordCount,
            readingTime,
            rawHtml: html
        };
    } catch (error) {
        throw new Error(`Failed to fetch URL content: ${error.message}`);
    }
}

/**
 * Analyze post content with OpenAI using the same system prompt as the submission script
 */
async function analyzePostWithAI(openai, postData, urlContent) {
    const prompt = buildAnalysisPrompt(postData, urlContent);
    
    try {
        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an expert content analyst for a tech news platform. Analyze the provided post content and return a JSON response with the following structure:

{
  "language": "detected language (e.g., 'English', 'Spanish')",
  "category": "main" or "show" (main for general content, show for announcing new products/initiatives/work)",
  "spellingScore": number 0-100 (0 = many spelling/grammar errors, 100 = perfect spelling/grammar)",
  "spellingIssues": ["array of specific spelling/grammar issues found"],
  "optimizedTitle": "improved title in sentence case (first letter capitalized, rest lowercase except proper nouns), no clickbait, no mistakes, proper length",
  "optimizedDescription": "improved description that's playful, entertaining, and engaging while maintaining accuracy and avoiding clickbait. Use humor, wit, and creative language to make tech content more fun to read. Keep it informative but add personality and charm.",
  "topics": ["array of relevant topics this post relates to"],
  "spamScore": number 0-100 (0 = legitimate content, 100 = obvious spam)",
  "spamIssues": ["array explaining why this was marked as spam, or empty if not spam"],
  "safetyScore": number 0-100 (0 = unsafe/inappropriate content, 100 = completely safe)",
  "safetyIssues": ["array of safety concerns, or empty if none found"],
  "readingLevel": "Beginner", "Intermediate", "Advanced", or "Expert" (based on content complexity)",
  "readingTime": number (estimated reading time in minutes)",
  "titleTranslations": {
    "en": "title in English (original if English, translated if not)",
    "es": "title in Spanish (original if Spanish, translated if not)",
    "fr": "title in French (original if French, translated if not)", 
    "de": "title in German (original if German, translated if not)",
    "it": "title in Italian (original if Italian, translated if not)",
    "pt": "title in Portuguese (original if Portuguese, translated if not)",
    "ru": "title in Russian (original if Russian, translated if not)",
    "ja": "title in Japanese (original if Japanese, translated if not)",
    "ko": "title in Korean (original if Korean, translated if not)",
    "zh": "title in Chinese (original if Chinese, translated if not)",
    "ar": "title in Arabic (original if Arabic, translated if not)",
    "he": "title in Hebrew (original if Hebrew, translated if not)"
  },
  "descriptionTranslations": {
    "en": "description in English (original if English, translated if not)",
    "es": "description in Spanish (original if Spanish, translated if not)",
    "fr": "description in French (original if French, translated if not)", 
    "de": "description in German (original if German, translated if not)",
    "it": "description in Italian (original if Italian, translated if not)",
    "pt": "description in Portuguese (original if Portuguese, translated if not)",
    "ru": "description in Russian (original if Russian, translated if not)",
    "ja": "description in Japanese (original if Japanese, translated if not)",
    "ko": "description in Korean (original if Korean, translated if not)",
    "zh": "title in Chinese (original if Chinese, translated if not)",
    "ar": "title in Arabic (original if Arabic, translated if not)",
    "he": "title in Hebrew (original if Hebrew, translated if not)"
  },
  "qualityScore": number 0-100 (0 = low impact/quality content, 100 = high impact/exceptional quality)",
  "qualityIssues": ["array explaining the quality score and any issues found"]
}

Guidelines:
- Be strict but fair with scoring
- Identify clickbait, misleading content, and inappropriate material
- Consider the context of tech news and community guidelines
- For reading level: Beginner (general audience), Intermediate (some technical knowledge), Advanced (technical audience), Expert (deep technical knowledge)
- For quality score: Consider relevance, accuracy, depth, originality, and impact on the tech community
- Translate titles and descriptions accurately while maintaining the meaning and tech terminology
- When analyzing HTML content: Look at the actual text content within HTML tags, ignore markup structure, focus on meaningful content in headings, paragraphs, and other text elements
- Writing Style: Make descriptions playful and entertaining by using:
  * Clever wordplay and tech puns when appropriate
  * Engaging metaphors and analogies
  * Light humor that fits the tech context
  * Dynamic and energetic language
  * Creative phrasing that makes technical concepts more accessible
  * A conversational, friendly tone that feels like chatting with a knowledgeable friend
  * IMPORTANT: Use appropriate tone based on content context:
    - For serious topics (deaths, tragedies, crises, controversies) → Use respectful, sensitive, and professional language
    - For technical announcements, product launches, innovations → Use playful and engaging language
    - For general tech news and updates → Use balanced, informative yet entertaining language
    - Always prioritize respect and sensitivity over entertainment when the content demands it
- Return only valid JSON, no additional text`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.1,
            max_tokens: 10000,
            response_format: { type: "json_object" }
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
            throw new Error('No response from OpenAI');
        }

        const metadata = JSON.parse(response);
        metadata = validateAndSanitizeMetadata(metadata, postData);
        console.log(metadata);
        return metadata;
        
    } catch (error) {
        throw new Error(`OpenAI analysis failed: ${error.message}`);
    }
}

/**
 * Build the analysis prompt for OpenAI
 */
function buildAnalysisPrompt(postData, urlContent) {
    const { title, description, url, type, company, location, salary } = postData;
    
    let prompt = `Analyze this ${type} post submission:\n\n`;
    prompt += `Title: "${title}"\n`;
    
    if (description) {
        prompt += `Description: "${description}"\n`;
    }
    
    if (url) {
        prompt += `URL: ${url}\n`;
    }
    
    if (type === 'job') {
        if (company) prompt += `Company: ${company}\n`;
        if (location) prompt += `Location: ${location}\n`;
        if (salary) prompt += `Salary: ${salary}\n`;
    }
    
    // Add URL content context if available
    if (urlContent) {
        prompt += `\n=== URL CONTENT ANALYSIS ===\n`;
        prompt += `URL Title: "${urlContent.title}"\n`;
        prompt += `URL Description: "${urlContent.description}"\n`;
        
        if (urlContent.rawHtml) {
            prompt += `\n=== WEBSITE HTML CONTENT (TRUNCATED) ===\n`;
            prompt += `The following is a truncated version of the HTML content from the website. Analyze this to understand the context:\n\n`;
            
            // Use token-aware truncation to stay well under limits
            // Reserve ~80k tokens for the prompt, ~40k for HTML content
            const maxTokensForHtml = 40000;
            const truncatedHtml = truncateToTokenLimit(urlContent.rawHtml, maxTokensForHtml);
            
            // Log token estimates for debugging
            const originalTokens = estimateTokenCount(urlContent.rawHtml);
            const truncatedTokens = estimateTokenCount(truncatedHtml);
            console.log(`HTML tokens: ${originalTokens} → ${truncatedTokens} (truncated)`);
            
            prompt += truncatedHtml;
            prompt += `\n=== END HTML CONTENT ===\n`;
        } else {
            prompt += `URL Content Preview: "${urlContent.content.substring(0, 1000)}..."\n`;
        }
        
        prompt += `URL Word Count: ${urlContent.wordCount}\n`;
        prompt += `URL Estimated Reading Time: ${urlContent.readingTime} minutes\n`;
        prompt += `=== END URL CONTENT ===\n`;
    }
    
    prompt += `\nPlease analyze this content and provide the requested metadata in JSON format.`;
    
    // Final safety check: estimate total tokens and warn if approaching limits
    const totalTokens = estimateTokenCount(prompt);
    if (totalTokens > 100000) {
        console.warn(`Warning: Prompt is ${totalTokens} tokens, approaching OpenAI limit of 128k`);
    }
    
    return prompt;
}

/**
 * Validate and sanitize the AI response metadata
 */
function validateAndSanitizeMetadata(metadata, postData) {
    return {
        language: typeof metadata.language === 'string' ? metadata.language : 'English',
        category: metadata.category === 'show' ? 'show' : 'main',
        spellingScore: Math.max(0, Math.min(100, Number(metadata.spellingScore) || 0)),
        spellingIssues: Array.isArray(metadata.spellingIssues) ? metadata.spellingIssues : [],
        optimizedTitle: typeof metadata.optimizedTitle === 'string' ? metadata.optimizedTitle : postData.title,
        optimizedDescription: typeof metadata.optimizedDescription === 'string' ? metadata.optimizedDescription : postData.description || '',
        originalTitle: postData.title,
        originalDescription: postData.description || '',
        topics: Array.isArray(metadata.topics) ? metadata.topics : [],
        spamScore: Math.max(0, Math.min(100, Number(metadata.spamScore) || 0)),
        spamIssues: Array.isArray(metadata.spamIssues) ? metadata.spamIssues : [],
        safetyScore: Math.max(0, Math.min(100, Number(metadata.safetyScore) || 0)),
        safetyIssues: Array.isArray(metadata.safetyIssues) ? metadata.safetyIssues : [],
        readingLevel: validateReadingLevel(metadata.readingLevel),
        readingTime: Math.max(1, Math.min(480, Number(metadata.readingTime) || 5)),
        titleTranslations: validateTranslations(metadata.titleTranslations),
        descriptionTranslations: validateTranslations(metadata.descriptionTranslations),
        qualityScore: Math.max(0, Math.min(100, Number(metadata.qualityScore) || 50)),
        qualityIssues: Array.isArray(metadata.qualityIssues) ? metadata.qualityIssues : []
    };
}

/**
 * Validate reading level
 */
function validateReadingLevel(level) {
    const validLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    return validLevels.includes(level) ? level : 'Intermediate';
}

/**
 * Validate translations object
 */
function validateTranslations(translations) {
    if (typeof translations === 'object' && translations !== null) {
        const validTranslations = {};
        const validLocales = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'he'];
        
        for (const locale of validLocales) {
            if (translations[locale] && typeof translations[locale] === 'string') {
                validTranslations[locale] = translations[locale];
            }
        }
        
        return validTranslations;
    }
    
    return {};
}

/**
 * Estimate token count for a given text
 * Rough approximation: 1 token ≈ 4 characters for English text
 */
function estimateTokenCount(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token limits
 */
function truncateToTokenLimit(text, maxTokens) {
    if (!text) return '';
    const maxChars = maxTokens * 4; // Rough character estimate
    if (text.length <= maxChars) return text;
    
    return text.substring(0, maxChars) + '\n\n[Content truncated to fit token limits]';
}

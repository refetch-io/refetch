/**
 * Enhancement Appwrite Function
 * 
 * This function fetches posts from the posts collection, enhances them with AI metadata
 * using the same system prompt as the post submission script, and updates them back to the database.
 */

import { Client, Databases, Query } from 'node-appwrite';
import OpenAI from 'openai';
import { JSDOM } from 'jsdom';

// System prompt for AI content analysis
const SYSTEM_PROMPT = `You are an expert content analyst for a tech news platform. Analyze the provided post content and return a JSON response with the following structure:

{
  "language": "detected language (e.g., 'English', 'Spanish')",
  "type": "link" or "show" (IMPORTANT: This is the AI-recommended post type. "show" = product launches/announcements/initiatives, "link" = general tech news/analysis)",
  "spellingScore": number 0-100 (0 = many spelling/grammar errors, 100 = perfect spelling/grammar)",
  "spellingIssues": ["array of specific spelling/grammar issues found"],
  "spamScore": number 0-100 (0 = legitimate content, 100 = obvious spam)",
  "spamIssues": ["array explaining why this was marked as spam, or empty if not spam"],
  "safetyScore": number 0-100 (0 = unsafe/inappropriate content, 100 = completely safe)",
  "safetyIssues": ["array of safety concerns, or empty if none found"],
  "qualityScore": number 0-100 (0 = low impact/quality content, 100 = high impact/exceptional quality)",
  "qualityIssues": ["array explaining the quality score and any issues found"],
  "optimizedTitle": "improved title in sentence case (first letter capitalized, rest lowercase except proper nouns), no clickbait, no mistakes, proper length",
  "optimizedDescription": "improved description that's playful, entertaining, and engaging while maintaining accuracy and avoiding clickbait. Use humor, wit, and creative language to make tech content more fun to read. Keep it informative but add personality and charm.",
  "readingLevel": "Beginner", "Intermediate", "Advanced", or "Expert" (based on content complexity)",
  "readingTime": number (estimated reading time in minutes)",
  "topics": ["array of relevant topics this post relates to"],
  "tldr": "A concise 2-3 sentence summary of the key points from the article content. Focus on the main takeaways, findings, or announcements. If no substantial content is available, provide a brief summary based on the title and description.",
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
    "zh": "description in Chinese (original if Chinese, translated if not)",
    "ar": "description in Arabic (original if Arabic, translated if not)",
    "he": "description in Hebrew (original if Hebrew, translated if not)"
  }
}

CRITICAL GUIDELINES:
- The "type" field MUST be either "link" or "show" - NEVER "main", "job", or any other value
- Enhanced types are:
  * "show" = Product launches, company announcements, new features, showcases, demos, "announcing", "launching", "introducing", "new release", "now available", "beta", "alpha", "preview", "open source alternative", "competitor to", "replacement for"
  * "link" = General tech news, industry updates, analysis, reviews, tutorials, guides, discussions, controversies, research findings, acquisitions, mergers, business deals, company sales, investment rounds, funding announcements
- IMPORTANT: Acquisition offers, mergers, company sales, and business transactions should be classified as "link", NOT "show". The "show" type is specifically for product launches and feature announcements, not business deals.
- SPAM DETECTION: Be extremely strict about identifying low-quality content that adds zero value:
  * Posts with minimal content like "test", "test 2", "hello", "checking", etc. should get spamScore 90-100
  * Posts with no meaningful description or just placeholder text should get spamScore 80-100
  * Posts that are clearly testing the system or have no tech relevance should get spamScore 90-100
  * Posts with extremely short titles (< 10 characters) and no description should be flagged as potential spam
  * Posts that appear to be automated testing or bot-generated content should get high spam scores
  * Posts that don't provide any tech news, analysis, or meaningful information should get spamScore 80-100
  * Posts with broken URLs (404, 403, 500 errors, connection failures) should get spamScore 70-90
  * Posts linking to non-existent pages or returning HTTP errors should be considered suspicious
  * Posts with URLs that fail to load or return error pages should get higher spam scores
- QUALITY SCORING: Be strict about content quality:
  * Posts with no substantial content, just test messages, or placeholder text should get qualityScore 0-20
  * Posts that don't provide any tech news, analysis, or meaningful information should get qualityScore 0-30
  * Consider the platform's purpose: sharing valuable tech content, not testing or placeholder posts
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
- Return only valid JSON, no additional text`;

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
        
        // Fetch only posts that haven't been enhanced yet
        const postsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [
                Query.notEqual('enhanced', true),
                Query.limit(5) // Process up to 100 posts at a time
            ]
        );
        
        const posts = postsResponse.documents;
        log(`Found ${posts.length} posts to enhance`);
        
        let processedCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        let flaggedCount = 0;
        let highSpamCount = 0;
        let lowQualityCount = 0;
        
                // Process each post
        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            const progress = Math.round(((i + 1) / posts.length) * 100);
            
            try {
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
                let urlError = null;
                if (postData.url && postData.type === 'link') {
                    try {
                        urlContent = await fetchURLContent(postData.url);
                    } catch (fetchError) {
                        urlError = fetchError;
                        log(`⚠️  Failed to fetch URL content for ${post.$id}: ${fetchError.message}`);
                        // Continue without URL content, but we'll use the error info for spam detection
                    }
                }
                
                // Analyze post with AI
                const metadata = await analyzePostWithAI(openai, postData, urlContent, urlError);
                
                // Check for high spam scores and flag accordingly
                const isHighSpam = metadata.spamScore >= 90;
                const isLowQuality = metadata.qualityScore <= 20;
                
                // Update post with enhanced attributes
                const updateData = {
                    enhanced: true,
                    type: metadata.type, // Store the AI-recommended type
                    language: metadata.language,
                    spellingScore: metadata.spellingScore,
                    spellingIssues: metadata.spellingIssues,
                    spamScore: metadata.spamScore,
                    spamIssues: metadata.spamIssues,
                    safetyScore: metadata.safetyScore,
                    safetyIssues: metadata.safetyIssues,
                    qualityScore: metadata.qualityScore,
                    qualityIssues: metadata.qualityIssues,
                    optimizedTitle: metadata.optimizedTitle,
                    optimizedDescription: metadata.optimizedDescription,
                    readingLevel: metadata.readingLevel,
                    readingTime: metadata.readingTime,
                    topics: metadata.topics,
                    tldr: metadata.tldr,
                    titleTranslations: JSON.stringify(metadata.titleTranslations),
                    descriptionTranslations: JSON.stringify(metadata.descriptionTranslations)
                };
                
                // Log spam detection
                if (isHighSpam) {
                    log(`🚨 HIGH SPAM DETECTED - Post ID: ${post.$id}, Title: "${post.title}", Spam Score: ${metadata.spamScore}, Issues: ${metadata.spamIssues.join(', ')}`);
                    highSpamCount++;
                    flaggedCount++;
                }
                
                if (isLowQuality) {
                    log(`⚠️  LOW QUALITY DETECTED - Post ID: ${post.$id}, Title: "${post.title}", Quality Score: ${metadata.qualityScore}, Issues: ${metadata.qualityIssues.join(', ')}`);
                    lowQualityCount++;
                    if (!isHighSpam) flaggedCount++; // Don't double count
                }
                
                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTION_ID,
                    post.$id,
                    updateData
                );
                updatedCount++;
                
                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Log progress every 2 posts or at the end
                if ((i + 1) % 2 === 0 || i === posts.length - 1) {
                    const tldrStatus = metadata.tldr ? '✅' : '❌';
                    log(`📈 Progress: ${i + 1}/${posts.length} (${progress}%) - Enhanced: ${updatedCount}, Errors: ${errorCount}, TL;DR: ${tldrStatus}`);
                }
                
            } catch (postError) {
                error(`❌ Error processing post ${post.$id}: ${postError.message}`);
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
                errors: errorCount,
                flagged: flaggedCount,
                highSpam: highSpamCount,
                lowQuality: lowQualityCount,
                successRate: posts.length > 0 ? Math.round((updatedCount / posts.length) * 100) : 0
            }
        };
        
        // Comprehensive final summary
        log('🎯 ENHANCEMENT FUNCTION COMPLETED');
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        log(`📊 Total posts found: ${posts.length}`);
        log(`✅ Successfully enhanced: ${updatedCount}`);
        log(`❌ Errors encountered: ${errorCount}`);
        log(`📈 Success rate: ${result.summary.successRate}%`);
        log(`📝 TL;DR summaries generated: ${posts.filter(p => p.tldr).length}/${posts.length}`);
        log(`🚨 Posts flagged for review: ${flaggedCount} (${highSpamCount} high spam, ${lowQualityCount} low quality)`);
        log(`⏱️  Processing time: ${new Date().toISOString()}`);
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (errorCount > 0) {
            log(`⚠️  ${errorCount} posts failed to process. Check error logs for details.`);
        }
        
        if (updatedCount === 0) {
            log('ℹ️  No posts were enhanced. This might indicate all posts are already enhanced or there was an issue with the enhancement process.');
        }
        
        if (flaggedCount > 0) {
            log(`🚨 ATTENTION: ${flaggedCount} posts were flagged for review due to high spam scores or low quality content.`);
            log(`   High spam posts: ${highSpamCount} - These should be reviewed and potentially removed.`);
            log(`   Low quality posts: ${lowQualityCount} - These may need improvement or removal.`);
        }
        
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
async function analyzePostWithAI(openai, postData, urlContent, urlError) {
            const prompt = buildAnalysisPrompt(postData, urlContent, urlError);
    
    try {
        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.1,
            max_tokens: 16384,
            response_format: { type: "json_object" }
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
            throw new Error('No response from OpenAI');
        }

        const metadata = JSON.parse(response);
        const validatedMetadata = validateAndSanitizeMetadata(metadata, postData);
        
        // Log compact post reference
        console.log(`📝 AI Analysis completed - ID: ${postData.title ? postData.title.substring(0, 50) : 'No title'} | URL: ${postData.url ? postData.url.substring(0, 60) : 'No URL'} | TL;DR: ${metadata.tldr ? metadata.tldr.substring(0, 80) + '...' : 'Not generated'}`);
        
        return validatedMetadata;
    } catch (error) {
        throw new Error(`OpenAI analysis failed: ${error.message}`);
    }
}

/**
 * Build the analysis prompt for OpenAI
 */
function buildAnalysisPrompt(postData, urlContent, urlError) {
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
        prompt += `\nIMPORTANT: Use the actual article content above to generate an accurate and informative TL;DR summary. Focus on the main points, key findings, or announcements from the article. The TL;DR should be 2-3 sentences that capture the essence of what the article is about.\n`;
        prompt += `=== END URL CONTENT ===\n`;
    } else if (urlError) {
        // Add URL error context for spam detection
        prompt += `\n=== URL ERROR ANALYSIS ===\n`;
        prompt += `URL Status: FAILED TO LOAD\n`;
        prompt += `Error Details: ${urlError.message}\n`;
        
        // Extract HTTP status codes if available
        if (urlError.message.includes('HTTP')) {
            const httpMatch = urlError.message.match(/HTTP (\d+):/);
            if (httpMatch) {
                const statusCode = parseInt(httpMatch[1]);
                prompt += `HTTP Status Code: ${statusCode}\n`;
                
                if (statusCode === 404) {
                    prompt += `Error Type: Page Not Found - The linked page does not exist\n`;
                } else if (statusCode === 403) {
                    prompt += `Error Type: Forbidden - Access to the page is denied\n`;
                } else if (statusCode >= 500) {
                    prompt += `Error Type: Server Error - The website is experiencing technical issues\n`;
                } else if (statusCode >= 400) {
                    prompt += `Error Type: Client Error - The request cannot be fulfilled\n`;
                }
            }
        } else if (urlError.message.includes('timeout')) {
            prompt += `Error Type: Connection Timeout - The website took too long to respond\n`;
        } else if (urlError.message.includes('fetch')) {
            prompt += `Error Type: Network Error - Unable to connect to the website\n`;
        }
        
        prompt += `\nIMPORTANT: This URL failed to load, which may indicate a broken link, non-existent page, or malicious URL. Consider this when evaluating spam score and quality. Posts with broken URLs should receive higher spam scores as they provide no value to users.\n`;
        prompt += `=== END URL ERROR ===\n`;
    }
    
    prompt += `\nPlease analyze this content and provide the requested metadata in JSON format. Pay special attention to generating an accurate TL;DR summary based on the actual article content when available. If no article content is available, generate a TL;DR based on the title and description provided.`;
    
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
    // Validate and sanitize type field
    const validatedType = validateType(metadata.type);
    
    return {
        language: typeof metadata.language === 'string' ? metadata.language.substring(0, 10) : 'English',
        type: validatedType,
        type: validatedType, // Also return type for database update
        spellingScore: Math.max(0, Math.min(100, Number(metadata.spellingScore) || 0)),
        spellingIssues: Array.isArray(metadata.spellingIssues) ? metadata.spellingIssues.slice(0, 50) : [],
        spamScore: Math.max(0, Math.min(100, Number(metadata.spamScore) || 0)),
        spamIssues: Array.isArray(metadata.spamIssues) ? metadata.spamIssues.slice(0, 50) : [],
        safetyScore: Math.max(0, Math.min(100, Number(metadata.safetyScore) || 0)),
        safetyIssues: Array.isArray(metadata.safetyIssues) ? metadata.safetyIssues.slice(0, 50) : [],
        qualityScore: Math.max(0, Math.min(100, Number(metadata.qualityScore) || 50)),
        qualityIssues: Array.isArray(metadata.qualityIssues) ? metadata.qualityIssues.slice(0, 50) : [],
        optimizedTitle: typeof metadata.optimizedTitle === 'string' ? metadata.optimizedTitle.substring(0, 500) : postData.title.substring(0, 500),
        optimizedDescription: typeof metadata.optimizedDescription === 'string' ? metadata.optimizedDescription.substring(0, 2000) : (postData.description || '').substring(0, 2000),
        readingLevel: validateReadingLevel(metadata.readingLevel),
        readingTime: Math.max(1, Math.min(480, Number(metadata.readingTime) || 5)),
        topics: Array.isArray(metadata.topics) ? metadata.topics.slice(0, 20) : [],
        tldr: typeof metadata.tldr === 'string' ? metadata.tldr.substring(0, 2000) : (postData.description ? `TL;DR: ${postData.description.substring(0, 2000)}...` : 'No summary available'),
        titleTranslations: validateTranslations(metadata.titleTranslations),
        descriptionTranslations: validateTranslations(metadata.descriptionTranslations)
    };
}

/**
 * Validate type field - must be 'link' or 'show'
 */
function validateType(type) {
    const validTypes = ['link', 'show'];
    
    // Log invalid types for debugging
    if (type && !validTypes.includes(type)) {
        console.warn(`⚠️ Invalid type returned by LLM: "${type}". Defaulting to "link".`);
    }
    
    return validTypes.includes(type) ? type : 'link';
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

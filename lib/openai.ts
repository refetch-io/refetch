import OpenAI from 'openai';
import { PostSubmissionData, PostMetadata } from './types';
import { URLContentFetcher, FetchedContent } from './urlFetcher';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class PostMetadataEnhancer {
  private static async analyzePostContent(data: PostSubmissionData, urlContent?: FetchedContent): Promise<PostMetadata> {
    const prompt = this.buildAnalysisPrompt(data, urlContent);
    
    // Log payload size for monitoring
    const promptSize = new Blob([prompt]).size;
    console.log(`LLM payload size: ${(promptSize / 1024).toFixed(2)}KB`);
    
    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o",
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
    "zh": "description in Chinese (original if Chinese, translated if not)",
    "ar": "description in Arabic (original if Arabic, translated if not)",
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
- For category classification:
  * "show" = Product launches, company announcements, new features, showcases, demos, "announcing", "launching", "introducing", "new release", "now available", "beta", "alpha", "preview", "open source alternative", "competitor to", "replacement for"
  * "main" = General tech news, industry updates, analysis, reviews, tutorials, guides, discussions, controversies, research findings
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

      const metadata: PostMetadata = JSON.parse(response);
      
      // Validate and sanitize the response
      return this.validateAndSanitizeMetadata(metadata);
    } catch (error) {
      console.error('Error analyzing post content with OpenAI:', error);
      // Return default metadata if OpenAI fails
      return this.getDefaultMetadata(data);
    }
  }

  private static buildAnalysisPrompt(data: PostSubmissionData, urlContent?: FetchedContent): string {
    const { title, description, url, type, company, location, salary } = data;
    
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
      
      // Include raw HTML for LLM to analyze directly
      if (urlContent.rawHtml) {
        const htmlSize = (urlContent.rawHtml.length / 1024).toFixed(2);
        console.log(`Including raw HTML content: ${htmlSize}KB`);
        prompt += `\n=== FULL WEBSITE HTML CONTENT ===\n`;
        prompt += `The following is the raw HTML content from the website. Analyze this directly to understand the full context:\n\n`;
        prompt += urlContent.rawHtml;
        prompt += `\n=== END HTML CONTENT ===\n`;
      } else {
        // Fallback to parsed content if raw HTML is not available
        prompt += `URL Content Preview: "${urlContent.content.substring(0, 1000)}..."\n`;
      }
      
      prompt += `URL Word Count: ${urlContent.wordCount}\n`;
      prompt += `URL Estimated Reading Time: ${urlContent.readingTime} minutes\n`;
      prompt += `URL Detected Language: ${urlContent.language}\n`;
      prompt += `=== END URL CONTENT ===\n`;
    }
    
    prompt += `\nPlease analyze this content and provide the requested metadata in JSON format.`;
    
    return prompt;
  }

  private static validateAndSanitizeMetadata(metadata: any): PostMetadata {
    // Ensure all required fields exist and have proper types
    return {
      language: typeof metadata.language === 'string' ? metadata.language : 'English',
      category: metadata.category === 'show' ? 'show' : 'main',
      spellingScore: Math.max(0, Math.min(100, Number(metadata.spellingScore) || 0)),
      spellingIssues: Array.isArray(metadata.spellingIssues) ? metadata.spellingIssues : [],
      optimizedTitle: typeof metadata.optimizedTitle === 'string' ? metadata.optimizedTitle : '',
      optimizedDescription: typeof metadata.optimizedDescription === 'string' ? metadata.optimizedDescription : '',
      originalTitle: typeof metadata.originalTitle === 'string' ? metadata.originalTitle : '',
      originalDescription: typeof metadata.originalDescription === 'string' ? metadata.originalDescription : '',
      topics: Array.isArray(metadata.topics) ? metadata.topics : [],
      spamScore: Math.max(0, Math.min(100, Number(metadata.spamScore) || 0)),
      spamIssues: Array.isArray(metadata.spamIssues) ? metadata.spamIssues : [],
      safetyScore: Math.max(0, Math.min(100, Number(metadata.safetyScore) || 0)),
      safetyIssues: Array.isArray(metadata.safetyIssues) ? metadata.safetyIssues : [],
      readingLevel: this.validateReadingLevel(metadata.readingLevel),
      readingTime: Math.max(1, Math.min(480, Number(metadata.readingTime) || 5)), // 1 min to 8 hours
      titleTranslations: this.validateTranslations(metadata.titleTranslations),
      descriptionTranslations: this.validateTranslations(metadata.descriptionTranslations),
      qualityScore: Math.max(0, Math.min(100, Number(metadata.qualityScore) || 50)),
      qualityIssues: Array.isArray(metadata.qualityIssues) ? metadata.qualityIssues : []
    };
  }

  private static validateReadingLevel(level: any): 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' {
    const validLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    return validLevels.includes(level) ? level : 'Intermediate';
  }

  private static validateTranslations(translations: any): { [localeCode: string]: string } {
    if (typeof translations !== 'object' || translations === null) {
      return {};
    }
    
    const validLocales = [
      'en', 'es', 'fr', 'de', 'it', 'pt', 
      'ru', 'ja', 'ko', 'zh', 'ar', 'he'
    ];
    
    const validated: { [localeCode: string]: string } = {};
    validLocales.forEach(locale => {
      if (typeof translations[locale] === 'string' && translations[locale].trim()) {
        validated[locale] = translations[locale].trim();
      }
    });
    
    return validated;
  }

  private static getDefaultMetadata(data: PostSubmissionData): PostMetadata {
    return {
      language: 'English',
      category: data.type === 'show' ? 'show' : 'main',
      spellingScore: 80,
      spellingIssues: [],
      optimizedTitle: data.title,
      optimizedDescription: data.description || '',
      originalTitle: data.title,
      originalDescription: data.description || '',
      topics: [],
      spamScore: 10,
      spamIssues: [],
      safetyScore: 90,
      safetyIssues: [],
      readingLevel: 'Intermediate',
      readingTime: 5,
      titleTranslations: {},
      descriptionTranslations: {},
      qualityScore: 50,
      qualityIssues: []
    };
  }

  public static async enhancePost(data: PostSubmissionData): Promise<PostMetadata> {
    let urlContent: FetchedContent | undefined = undefined;
    
    // Fetch URL content if URL is provided
    if (data.url && data.type === 'link') {
      try {
        console.log('Fetching URL content for analysis...');
        urlContent = await URLContentFetcher.fetchContent(data.url);
        if (urlContent) {
          console.log('URL content fetched successfully:', {
            title: urlContent.title,
            wordCount: urlContent.wordCount,
            readingTime: urlContent.readingTime
          });
        }
      } catch (error) {
        console.error('Failed to fetch URL content:', error);
        // Continue without URL content
      }
    }
    
    return await this.analyzePostContent(data, urlContent);
  }
}

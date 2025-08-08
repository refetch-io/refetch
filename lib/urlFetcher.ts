import { JSDOM } from 'jsdom';

export interface FetchedContent {
  title: string;
  description: string;
  content: string;
  readingTime: number;
  wordCount: number;
  language: string;
  rawHtml?: string; // Add raw HTML for LLM processing
}

export class URLContentFetcher {
  static async fetchContent(url: string): Promise<FetchedContent | undefined> {
    try {
      // Fetch the URL content
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
      
      // Extract main content (prioritize article content, then main content)
      let content = '';
      const article = document.querySelector('article') || document.querySelector('[role="main"]') || document.querySelector('main');
      if (article) {
        content = article.textContent || '';
      } else {
        // Fallback to body content
        const body = document.querySelector('body');
        if (body) {
          // Remove script and style elements
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

      // Calculate reading time (average reading speed: 200-250 words per minute)
      const wordCount = content.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 225); // Using 225 WPM as average

      // Detect language (simple heuristic - can be enhanced)
      const language = this.detectLanguage(content);

      // Prepare raw HTML for LLM (limit size to reasonable payload)
      const rawHtml = this.prepareHtmlForLLM(html);

      return {
        title,
        description: metaDescription,
        content,
        readingTime,
        wordCount,
        language,
        rawHtml
      };
    } catch (error) {
      console.error('Error fetching URL content:', error);
      return undefined;
    }
  }

  private static detectLanguage(text: string): string {
    // Simple language detection based on common words
    const textLower = text.toLowerCase();
    
    if (textLower.includes('the ') && textLower.includes(' and ') && textLower.includes(' of ')) {
      return 'English';
    }
    if (textLower.includes('el ') && textLower.includes(' y ') && textLower.includes(' de ')) {
      return 'Spanish';
    }
    if (textLower.includes('le ') && textLower.includes(' et ') && textLower.includes(' de ')) {
      return 'French';
    }
    if (textLower.includes('der ') && textLower.includes(' und ') && textLower.includes(' von ')) {
      return 'German';
    }
    if (textLower.includes('il ') && textLower.includes(' e ') && textLower.includes(' di ')) {
      return 'Italian';
    }
    if (textLower.includes('o ') && textLower.includes(' e ') && textLower.includes(' de ')) {
      return 'Portuguese';
    }
    if (textLower.includes('het ') && textLower.includes(' en ') && textLower.includes(' van ')) {
      return 'Dutch';
    }
    if (textLower.includes('das ') && textLower.includes(' und ') && textLower.includes(' von ')) {
      return 'German';
    }
    if (textLower.includes('den ') && textLower.includes(' och ') && textLower.includes(' av ')) {
      return 'Swedish';
    }
    if (textLower.includes('det ') && textLower.includes(' og ') && textLower.includes(' av ')) {
      return 'Norwegian';
    }
    
    return 'English'; // Default to English
  }

  private static prepareHtmlForLLM(html: string): string {
    // Remove unnecessary elements that don't add value for content analysis
    let cleanedHtml = html
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove style tags and their content
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();

    // Estimate total payload size (base prompt + HTML + other content)
    // Base prompt is roughly 2-3KB, other content ~1KB, so we can use more HTML
    const estimatedBaseSize = 4000; // 4KB for base prompt and other content
    const maxTotalPayload = 80000; // 80KB total payload limit
    const maxHtmlSize = maxTotalPayload - estimatedBaseSize; // ~76KB for HTML

    if (cleanedHtml.length > maxHtmlSize) {
      // Try to preserve important content by keeping the beginning and end
      const halfSize = Math.floor(maxHtmlSize / 2);
      cleanedHtml = cleanedHtml.substring(0, halfSize) + 
                   '\n\n[HTML content truncated due to size limits - preserving beginning and end sections...]\n\n' +
                   cleanedHtml.substring(cleanedHtml.length - halfSize);
      
      console.log(`HTML content truncated from ${html.length} to ${cleanedHtml.length} characters for LLM payload`);
    }

    return cleanedHtml;
  }
}

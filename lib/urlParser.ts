/**
 * Secure URL parsing utility for comments
 * Handles URL detection, validation, and safe link generation with SEO protection
 */

// Allowed URL schemes for security
const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:']
const ALLOWED_PROTOCOLS = ['http', 'https', 'mailto']

// Maximum URL length to prevent abuse
const MAX_URL_LENGTH = 2048

// Regex patterns for URL detection
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi
const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi

/**
 * Validates if a URL is safe and allowed
 */
function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    
    // Check if scheme is allowed
    if (!ALLOWED_SCHEMES.includes(parsedUrl.protocol)) {
      return false
    }
    
    // Check URL length
    if (url.length > MAX_URL_LENGTH) {
      return false
    }
    
    // Additional security checks
    // Prevent javascript: and data: URLs
    if (url.toLowerCase().startsWith('javascript:') || 
        url.toLowerCase().startsWith('data:') ||
        url.toLowerCase().startsWith('vbscript:') ||
        url.toLowerCase().startsWith('file:')) {
      return false
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /file:/i,
      /<script/i,
      /on\w+\s*=/i, // onclick, onload, etc.
    ]
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        return false
      }
    }
    
    return true
  } catch {
    return false
  }
}

/**
 * Validates if an email address is safe
 */
function isValidEmail(email: string): boolean {
  // Basic email validation
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailPattern.test(email) && email.length <= 254
}

/**
 * Sanitizes text to prevent XSS attacks
 */
function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Creates a safe link element with SEO protection
 */
function createSafeLink(url: string, text: string): string {
  const sanitizedUrl = sanitizeText(url)
  const sanitizedText = sanitizeText(text)
  
  return `<a href="${sanitizedUrl}" 
              target="_blank" 
              rel="noopener noreferrer nofollow" 
              class="text-blue-600 hover:text-blue-800 underline break-words"
              title="External link">${sanitizedText}</a>`
}

/**
 * Creates a safe mailto link
 */
function createSafeMailtoLink(email: string): string {
  const sanitizedEmail = sanitizeText(email)
  
  return `<a href="mailto:${sanitizedEmail}" 
              class="text-blue-600 hover:text-blue-800 underline break-words"
              title="Send email">${sanitizedEmail}</a>`
}

/**
 * Parses text and converts URLs and emails to safe clickable links
 */
export function parseUrlsInText(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }
  
  let result = text
  
  // First, handle URLs
  result = result.replace(URL_REGEX, (match) => {
    if (isValidUrl(match)) {
      return createSafeLink(match, match)
    }
    return match // Return original if invalid
  })
  
  // Then, handle email addresses
  result = result.replace(EMAIL_REGEX, (match) => {
    if (isValidEmail(match)) {
      return createSafeMailtoLink(match)
    }
    return match // Return original if invalid
  })
  
  return result
}

/**
 * Hook for parsing URLs in text (for use in forms, etc.)
 */
export function useUrlParser() {
  return {
    parseUrls: parseUrlsInText
  }
}

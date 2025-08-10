import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Cleans a URL by removing query strings and fragments
 * @param url - The URL to clean
 * @returns The cleaned URL without query strings and fragments
 */
export function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
  } catch (error) {
    // If URL parsing fails, return the original URL
    return url
  }
}

/**
 * Example usage of cleanUrl function:
 * 
 * cleanUrl('https://example.com/page?param=value&utm_source=google#section')
 * // Returns: 'https://example.com/page'
 * 
 * cleanUrl('https://github.com/user/repo?tab=readme-ov-file')
 * // Returns: 'https://github.com/user/repo'
 */

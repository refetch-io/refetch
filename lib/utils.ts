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

/**
 * Get the base URL for the application
 * Used for generating absolute URLs for OG images and other external references
 */
export function getBaseUrl(): string {
  // Check for environment variable first
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }
  
  // Fallback to localhost for development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  
  // Production fallback
  return 'https://refetch.io'
}

/**
 * Get the full URL for an asset (like OG images)
 * @param path - The asset path (e.g., '/og.png')
 * @returns The full URL
 */
export function getAssetUrl(path: string): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}${path}`
}

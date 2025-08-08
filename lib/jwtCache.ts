import { account } from './appwrite'

interface CachedJWT {
  jwt: string
  timestamp: number
}

const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes in milliseconds
const CACHE_KEY = 'refetch_jwt_cache'

/**
 * Get a JWT token, using cached version if available and not expired
 * @returns Promise<string> - The JWT token
 */
export const getCachedJWT = async (): Promise<string> => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      // Server-side, just get a fresh JWT
      const jwtResponse = await account.createJWT()
      return jwtResponse.jwt
    }

    // Check localStorage for cached JWT
    const cached = localStorage.getItem(CACHE_KEY)
    
    if (cached) {
      const cachedData: CachedJWT = JSON.parse(cached)
      const now = Date.now()
      
      // Check if cache is still valid (within 15 minutes)
      if (now - cachedData.timestamp < CACHE_DURATION) {
        return cachedData.jwt
      }
    }

    // Cache expired or doesn't exist, get fresh JWT
    const jwtResponse = await account.createJWT()
    const jwt = jwtResponse.jwt

    // Cache the new JWT
    const cacheData: CachedJWT = {
      jwt,
      timestamp: Date.now()
    }
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    
    return jwt
  } catch (error) {
    console.error('Error getting cached JWT:', error)
    throw error
  }
}

/**
 * Clear the cached JWT (useful for logout or when token becomes invalid)
 */
export const clearCachedJWT = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY)
  }
}

/**
 * Force refresh the JWT token (bypass cache)
 * @returns Promise<string> - The fresh JWT token
 */
export const refreshJWT = async (): Promise<string> => {
  try {
    const jwtResponse = await account.createJWT()
    const jwt = jwtResponse.jwt

    // Update cache with fresh token
    if (typeof window !== 'undefined') {
      const cacheData: CachedJWT = {
        jwt,
        timestamp: Date.now()
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    }

    return jwt
  } catch (error) {
    console.error('Error refreshing JWT:', error)
    throw error
  }
}

import { account } from './appwrite-web'

interface CachedJWT {
  jwt: string
  timestamp: number
}

const CACHE_DURATION = 15 * 60 * 1000
const CACHE_KEY = 'refetch_jwt_cache'

export async function getCachedJWT(): Promise<string> {
  if (typeof window === 'undefined') {
    const jwtResponse = await account.createJWT()
    return jwtResponse.jwt
  }

  const cached = localStorage.getItem(CACHE_KEY)
  if (cached) {
    const cachedData: CachedJWT = JSON.parse(cached)
    if (Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData.jwt
    }
  }

  const jwtResponse = await account.createJWT()
  const jwt = jwtResponse.jwt
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ jwt, timestamp: Date.now() } satisfies CachedJWT),
  )
  return jwt
}

export function clearCachedJWT(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY)
  }
}

export async function refreshJWT(): Promise<string> {
  const jwtResponse = await account.createJWT()
  const jwt = jwtResponse.jwt
  if (typeof window !== 'undefined') {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ jwt, timestamp: Date.now() } satisfies CachedJWT),
    )
  }
  return jwt
}

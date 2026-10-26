import { AppwriteException } from 'node-appwrite'
import { deleteCookie, getCookie, getRequestProtocol, setCookie } from '@tanstack/react-start/server'
import type { SessionUser } from '@/lib/types'
import { createSessionClient } from './appwrite.server'
import { syncProfile } from './profiles.server'

export const SESSION_COOKIE = 'refetch_session'

/**
 * Verified users are cached briefly so a page render (and the server
 * functions it triggers) costs a single round-trip to Appwrite. Mutations
 * always bypass the cache.
 */
const USER_CACHE_TTL = 30_000
const USER_CACHE_MAX = 1_000
const userCache = new Map<string, { user: SessionUser; expires: number }>()

function cacheUser(secret: string, user: SessionUser) {
  if (userCache.size >= USER_CACHE_MAX) {
    const oldest = userCache.keys().next().value
    if (oldest) userCache.delete(oldest)
  }
  userCache.set(secret, { user, expires: Date.now() + USER_CACHE_TTL })
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: getRequestProtocol() === 'https',
    sameSite: 'lax' as const,
    path: '/',
  }
}

export function setSessionCookie(secret: string, expire: string) {
  setCookie(SESSION_COOKIE, secret, { ...cookieOptions(), expires: new Date(expire) })
}

export function clearSessionCookie() {
  const secret = getCookie(SESSION_COOKIE)
  if (secret) userCache.delete(secret)
  deleteCookie(SESSION_COOKIE, cookieOptions())
}

export function getSessionSecret(): string | undefined {
  return getCookie(SESSION_COOKIE) || undefined
}

export async function getSessionUser(options: { fresh?: boolean } = {}): Promise<SessionUser | null> {
  const secret = getSessionSecret()
  if (!secret) return null

  if (!options.fresh) {
    const cached = userCache.get(secret)
    if (cached && cached.expires > Date.now()) return cached.user
  }

  try {
    const { account } = createSessionClient(secret)
    const account$ = await account.get()
    const user: SessionUser = {
      id: account$.$id,
      name: account$.name,
      email: account$.email,
    }
    cacheUser(secret, user)
    // Keep the public profile (name, join date) current; never blocks the request.
    void syncProfile(user, account$.registration)
    return user
  } catch (error) {
    userCache.delete(secret)
    // Expired or revoked session — drop the cookie so we stop retrying.
    if (error instanceof AppwriteException && error.code === 401) {
      deleteCookie(SESSION_COOKIE, cookieOptions())
    }
    return null
  }
}

export class AuthRequiredError extends Error {
  constructor() {
    super('Please sign in to continue.')
    this.name = 'AuthRequiredError'
  }
}

/** Resolve the signed-in user, always verifying the session with Appwrite. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser({ fresh: true })
  if (!user) throw new AuthRequiredError()
  return user
}

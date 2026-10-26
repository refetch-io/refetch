import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { deleteCookie, getCookie, getRequestProtocol, setCookie } from '@tanstack/react-start/server'
import type { SessionUser } from '@/lib/types'
import { getAppwriteConfig } from './env.server'

/*
 * Server session: a signed, httpOnly cookie holding who you are. People sign in
 * with Appwrite in the browser; the server verifies a short-lived JWT once
 * (see establishSession) and issues this cookie, so every request after that
 * is checked locally without a round-trip to Appwrite.
 */

export const SESSION_COOKIE = 'refetch_session'
const SESSION_DAYS = 30

interface Claims extends SessionUser {
  v: 1
  exp: number
}

/** SESSION_SECRET if set; otherwise derived from the server API key (never sent anywhere). */
function signingKey() {
  const explicit = process.env.SESSION_SECRET?.trim()
  if (explicit) return explicit
  return createHash('sha256').update(`refetch-session:${getAppwriteConfig().apiKey}`).digest()
}

function sign(payload: string) {
  return createHmac('sha256', signingKey()).update(payload).digest('base64url')
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: getRequestProtocol() === 'https',
    sameSite: 'lax' as const,
    path: '/',
  }
}

export function issueSession(user: SessionUser) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  const claims: Claims = { v: 1, id: user.id, name: user.name, email: user.email, exp }
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  setCookie(SESSION_COOKIE, `${payload}.${sign(payload)}`, { ...cookieOptions(), expires: new Date(exp) })
}

export function clearSessionCookie() {
  deleteCookie(SESSION_COOKIE, cookieOptions())
}

function readClaims(token: string): Claims | null {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Claims
    if (claims.v !== 1 || typeof claims.id !== 'string' || claims.exp < Date.now()) return null
    return claims
  } catch {
    return null
  }
}

/** The signed-in person, or null. (`fresh` is accepted for compatibility; checks are always local.) */
export async function getSessionUser(_options: { fresh?: boolean } = {}): Promise<SessionUser | null> {
  const token = getCookie(SESSION_COOKIE)
  if (!token) return null
  const claims = readClaims(token)
  if (!claims) {
    // Tampered, expired, or from the previous session scheme: start over.
    clearSessionCookie()
    return null
  }
  return { id: claims.id, name: claims.name, email: claims.email }
}

export class AuthRequiredError extends Error {
  constructor() {
    super('Please sign in to continue.')
    this.name = 'AuthRequiredError'
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new AuthRequiredError()
  return user
}

import { deleteCookie, getCookie, getRequestUrl, setCookie } from '@tanstack/react-start/server'
import { AppwriteException } from 'node-appwrite'
import type { ActionResult } from '@/lib/types'
import { safeRedirect } from '@/lib/redirect'
import { createAdminClient, describeAuthError } from './appwrite.server'
import { getPublicConfig } from './env.server'
import { setSessionCookie } from './session.server'
import { isNewMember } from './profiles.server'

const OAUTH_COOKIE = 'refetch_oauth'
const PROVIDER = 'appwrite'

function oauthCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: getRequestUrl().protocol === 'https:',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

/**
 * Start "Sign in with Appwrite". The browser is sent to Appwrite's OAuth2
 * token endpoint (the same URL the Web SDK builds); Appwrite then returns to
 * /auth/callback with a one-time `userId` + `secret`, which the server
 * exchanges for a session. A random `state` ties the callback to this browser.
 */
export function beginAppwriteOAuth(redirect?: string): ActionResult<{ url: string }> {
  const origin = getRequestUrl({ xForwardedHost: true }).origin
  const state = crypto.randomUUID()
  setCookie(
    OAUTH_COOKIE,
    JSON.stringify({ state, redirect: safeRedirect(redirect) }),
    oauthCookieOptions(600),
  )

  const { appwriteEndpoint, appwriteProjectId } = getPublicConfig()
  const url = new URL(`${appwriteEndpoint}/account/tokens/oauth2/${PROVIDER}`)
  url.searchParams.set('project', appwriteProjectId)
  url.searchParams.set('success', `${origin}/auth/callback`)
  url.searchParams.set('failure', `${origin}/signin?oauth=failed`)
  url.searchParams.set('state', state)
  return { ok: true, data: { url: url.toString() } }
}

function failure(message?: string) {
  const params = new URLSearchParams({ oauth: 'failed' })
  if (message) params.set('error', JSON.stringify({ message }))
  return `/signin?${params}`
}

/** Exchange the one-time token for a session; returns where to send the visitor. */
export async function completeAppwriteOAuth(params: {
  userId: string | null
  secret: string | null
  state: string | null
}): Promise<string> {
  let stored: { state?: string; redirect?: string } | null = null
  try {
    stored = JSON.parse(getCookie(OAUTH_COOKIE) ?? 'null')
  } catch {
    stored = null
  }
  deleteCookie(OAUTH_COOKIE, oauthCookieOptions(0))

  if (!params.userId || !params.secret || !stored?.state || stored.state !== params.state) {
    return failure('Your sign-in session expired. Please try again.')
  }

  try {
    const { account } = createAdminClient()
    const session = await account.createSession({ userId: params.userId, secret: params.secret })
    setSessionCookie(session.secret, session.expire)
    const destination = safeRedirect(stored.redirect)
    // New accounts pick a few channels and people before landing.
    if (await isNewMember(params.userId)) {
      return `/welcome?redirect=${encodeURIComponent(destination)}`
    }
    return destination
  } catch (error) {
    console.error('Appwrite OAuth session exchange failed', error)
    return failure(error instanceof AppwriteException ? describeAuthError(error) : undefined)
  }
}

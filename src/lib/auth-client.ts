import { establishSession, signOut as clearServerSession } from '@/api/session'
import type { ActionResult, SessionUser } from './types'
import { describeAuthError } from './auth-errors'
import { appwriteBrowser, type BrowserConfig } from './appwrite-browser'
import { safeRedirect } from './redirect'

/*
 * Sign-in happens in the browser with the Appwrite web SDK. Once Appwrite has
 * a session, the browser hands the server a short-lived JWT; the server checks
 * it with Appwrite and sets its own signed session cookie, so pages still
 * render signed in on the first byte.
 */

export type SignedIn = ActionResult<{ user: SessionUser; isNew: boolean }>

const OAUTH_STATE_KEY = 'refetch:oauth-state'
const OAUTH_REDIRECT_KEY = 'refetch:oauth-redirect'

async function handOff(config: BrowserConfig): Promise<SignedIn> {
  const { account } = await appwriteBrowser(config)
  const { jwt } = await account.createJWT()
  return establishSession({ data: { jwt } })
}

/** Start a fresh Appwrite session, replacing one left over in this browser. */
async function withFreshSession(config: BrowserConfig, create: () => Promise<unknown>) {
  const { account } = await appwriteBrowser(config)
  try {
    await create()
  } catch (error) {
    if (!(
      error &&
      typeof error === 'object' &&
      'type' in error &&
      error.type === 'user_session_already_exists'
    )) {
      throw error
    }
    await account.deleteSession({ sessionId: 'current' }).catch(() => {})
    await create()
  }
}

export async function signInWithEmail(
  config: BrowserConfig,
  email: string,
  password: string,
): Promise<SignedIn> {
  try {
    const { account } = await appwriteBrowser(config)
    await withFreshSession(config, () => account.createEmailPasswordSession({ email, password }))
    return await handOff(config)
  } catch (error) {
    return { ok: false, error: describeAuthError(error) }
  }
}

export async function signUpWithEmail(
  config: BrowserConfig,
  input: { name: string; email: string; password: string },
): Promise<SignedIn> {
  try {
    const { account, newId } = await appwriteBrowser(config)
    await account.create({ userId: newId(), email: input.email, password: input.password, name: input.name })
    await withFreshSession(config, () =>
      account.createEmailPasswordSession({ email: input.email, password: input.password }),
    )
    return await handOff(config)
  } catch (error) {
    return { ok: false, error: describeAuthError(error) }
  }
}

/** Send the browser to Appwrite; it comes back to /auth/callback with a one-time token. */
export async function startAppwriteOAuth(config: BrowserConfig, redirect?: string) {
  const { account, appwriteProvider } = await appwriteBrowser(config)
  const state = crypto.randomUUID()
  sessionStorage.setItem(OAUTH_STATE_KEY, state)
  sessionStorage.setItem(OAUTH_REDIRECT_KEY, safeRedirect(redirect))
  const origin = window.location.origin
  account.createOAuth2Token({
    provider: appwriteProvider,
    success: `${origin}/auth/callback`,
    failure: `${origin}/signin?oauth=failed`,
    state,
  })
}

/** Finish OAuth on /auth/callback. Returns where to go next. */
export async function completeAppwriteOAuth(
  config: BrowserConfig,
  params: { userId?: string; secret?: string; state?: string },
): Promise<SignedIn & { redirect: string }> {
  const expected = sessionStorage.getItem(OAUTH_STATE_KEY)
  const redirect = safeRedirect(sessionStorage.getItem(OAUTH_REDIRECT_KEY))
  sessionStorage.removeItem(OAUTH_STATE_KEY)
  sessionStorage.removeItem(OAUTH_REDIRECT_KEY)
  if (!params.userId || !params.secret || !expected || params.state !== expected) {
    return { ok: false, error: 'Your sign-in session expired. Please try again.', redirect }
  }
  try {
    const { account } = await appwriteBrowser(config)
    const { userId, secret } = params as { userId: string; secret: string }
    await withFreshSession(config, () => account.createSession({ userId, secret }))
    return { ...(await handOff(config)), redirect }
  } catch (error) {
    return { ok: false, error: describeAuthError(error), redirect }
  }
}

export async function signOutEverywhere(config: BrowserConfig) {
  await Promise.allSettled([
    appwriteBrowser(config).then(({ account }) => account.deleteSession({ sessionId: 'current' })),
    clearServerSession(),
  ])
}

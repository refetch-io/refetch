import { Account, Client } from 'node-appwrite'
import type { z } from 'zod'
import type { ActionResult, SessionUser } from '@/lib/types'
import { appToken, toAppResponse, validationMessage } from '@/lib/app-api'
import { getModeratorIds, getPublicConfig } from './env.server'
import { MODERATOR_LABELS } from './session.server'

/*
 * Server half of the app API (see src/lib/app-api.ts). Each request carries an
 * Appwrite JWT; it is verified with Appwrite (`account.get` as that user), the
 * same check `establishSession` does for the website before it issues a cookie.
 */

export interface AppUser {
  user: SessionUser
  /** Account registration time, for the profile sync on sign-in. */
  registration: string
}

/** JWT → verified user, briefly, so a burst of taps doesn't re-verify each time. */
const VERIFY_TTL_MS = 60_000
const verified = new Map<string, { at: number; value: AppUser }>()

async function verify(jwt: string): Promise<AppUser | null> {
  const now = Date.now()
  const hit = verified.get(jwt)
  if (hit && now - hit.at < VERIFY_TTL_MS) return hit.value

  const { appwriteEndpoint, appwriteProjectId } = getPublicConfig()
  let account
  try {
    const client = new Client().setEndpoint(appwriteEndpoint).setProject(appwriteProjectId).setJWT(jwt)
    account = await new Account(client).get()
  } catch {
    verified.delete(jwt)
    return null
  }
  const user: SessionUser = { id: account.$id, name: account.name, email: account.email }
  if (account.labels.some((label) => MODERATOR_LABELS.includes(label)) || getModeratorIds().has(user.id)) {
    user.moderator = true
  }
  const value = { user, registration: account.registration }
  if (verified.size > 1000) verified.clear()
  verified.set(jwt, { at: now, value })
  return value
}

function json(status: number, body: unknown) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
}

const UNAUTHORIZED = json(401, { error: 'Please sign in to continue.', code: 'unauthorized' })

/**
 * Authenticate, validate the JSON body against `schema`, run `action`, and
 * answer `{ data }` or `{ error, code? }` with a matching status.
 */
export async function handleAppRequest<S extends z.ZodType, T>(
  request: Request,
  schema: S,
  action: (input: z.infer<S>, appUser: AppUser) => Promise<ActionResult<T>>,
): Promise<Response> {
  const token = appToken(request.headers)
  if (!token) return UNAUTHORIZED.clone()
  const appUser = await verify(token)
  if (!appUser) return UNAUTHORIZED.clone()

  let raw: unknown = {}
  if (request.method !== 'GET' && request.method !== 'DELETE') {
    try {
      raw = await request.json()
    } catch {
      return json(400, { error: 'Send a JSON body.' })
    }
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return json(400, { error: validationMessage(parsed.error) })

  try {
    const { status, body } = toAppResponse(await action(parsed.data, appUser))
    return json(status, body)
  } catch (error) {
    console.error('[app-api]', new URL(request.url).pathname, error)
    return json(500, { error: 'Something went wrong. Please try again.' })
  }
}

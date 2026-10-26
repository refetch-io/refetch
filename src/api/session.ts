import { createServerFn } from '@tanstack/react-start'
import { ID } from 'node-appwrite'
import { z } from 'zod'
import type { ActionResult, SessionUser } from '@/lib/types'
import { LIMITS } from '@/lib/constants'
import { createAdminClient, createSessionClient, describeAuthError } from '@/server/appwrite.server'
import { getPublicConfig } from '@/server/env.server'
import { beginAppwriteOAuth } from '@/server/oauth.server'
import {
  clearSessionCookie,
  getSessionSecret,
  getSessionUser,
  setSessionCookie,
} from '@/server/session.server'

export const fetchSession = createServerFn({ method: 'GET' }).handler(async () => {
  return getSessionUser()
})

export const signIn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      email: z.email(),
      password: z.string().min(1).max(LIMITS.passwordMax),
    }),
  )
  .handler(async ({ data }): Promise<ActionResult<SessionUser>> => {
    try {
      const { account } = createAdminClient()
      const session = await account.createEmailPasswordSession({
        email: data.email,
        password: data.password,
      })
      setSessionCookie(session.secret, session.expire)
      const user = await createSessionClient(session.secret).account.get()
      return { ok: true, data: { id: user.$id, name: user.name, email: user.email } }
    } catch (error) {
      return { ok: false, error: describeAuthError(error) }
    }
  })

export const signUp = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().trim().min(1).max(LIMITS.nameMax),
      email: z.email(),
      password: z.string().min(LIMITS.passwordMin).max(LIMITS.passwordMax),
    }),
  )
  .handler(async ({ data }): Promise<ActionResult<SessionUser>> => {
    try {
      const { account } = createAdminClient()
      await account.create({
        userId: ID.unique(),
        email: data.email,
        password: data.password,
        name: data.name,
      })
      const session = await account.createEmailPasswordSession({
        email: data.email,
        password: data.password,
      })
      setSessionCookie(session.secret, session.expire)
      return { ok: true, data: { id: session.userId, name: data.name, email: data.email } }
    } catch (error) {
      return { ok: false, error: describeAuthError(error) }
    }
  })

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  const secret = getSessionSecret()
  if (secret) {
    try {
      await createSessionClient(secret).account.deleteSession({ sessionId: 'current' })
    } catch {
      // Already expired or revoked — clearing the cookie is enough.
    }
  }
  clearSessionCookie()
  return { ok: true as const }
})

export const startAppwriteOAuth = createServerFn({ method: 'POST' })
  .validator(z.object({ redirect: z.string().max(512).optional() }))
  .handler(({ data }) => beginAppwriteOAuth(data.redirect))

export const fetchPublicConfig = createServerFn({ method: 'GET' }).handler(async () => getPublicConfig())

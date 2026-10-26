import { createServerFn } from '@tanstack/react-start'
import { Account, Client } from 'node-appwrite'
import { z } from 'zod'
import type { ActionResult, SessionUser } from '@/lib/types'
import { getPublicConfig } from '@/server/env.server'
import { isNewMember, syncProfile } from '@/server/profiles.server'
import { clearSessionCookie, getSessionUser, issueSession } from '@/server/session.server'

export const fetchSession = createServerFn({ method: 'GET' }).handler(async () => {
  return getSessionUser()
})

/**
 * Called by the browser right after it signs in with Appwrite: verify the JWT
 * with Appwrite, then issue the server session cookie.
 */
export const establishSession = createServerFn({ method: 'POST' })
  .validator(z.object({ jwt: z.string().min(16).max(4096) }))
  .handler(async ({ data }): Promise<ActionResult<{ user: SessionUser; isNew: boolean }>> => {
    const { appwriteEndpoint, appwriteProjectId } = getPublicConfig()
    let account
    try {
      const client = new Client().setEndpoint(appwriteEndpoint).setProject(appwriteProjectId).setJWT(data.jwt)
      account = await new Account(client).get()
    } catch {
      return { ok: false, error: 'Your sign-in expired before it finished. Please try again.' }
    }
    const user: SessionUser = { id: account.$id, name: account.name, email: account.email }
    const isNew = await isNewMember(user.id)
    await syncProfile(user, account.registration)
    issueSession(user)
    return { ok: true, data: { user, isNew } }
  })

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  clearSessionCookie()
  return { ok: true as const }
})

export const fetchPublicConfig = createServerFn({ method: 'GET' }).handler(async () => getPublicConfig())

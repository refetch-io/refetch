import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { ActionResult } from '@/lib/types'
import { MUTE_KINDS, type Mute, type MuteKind } from '@/lib/mutes'
import { listMutes, setMuted } from '@/server/mutes.server'
import { getSessionUser } from '@/server/session.server'

const UNAUTHORIZED = { ok: false, code: 'unauthorized', error: 'Please sign in to continue.' } as const

export const fetchMutes = createServerFn({ method: 'GET' }).handler(async (): Promise<Array<Mute>> => {
  const user = await getSessionUser()
  return user ? listMutes(user.id) : []
})

export const saveMute = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      kind: z.enum(MUTE_KINDS as [MuteKind, ...Array<MuteKind>]),
      value: z.string().trim().min(1).max(300),
      muted: z.boolean(),
    }),
  )
  .handler(async ({ data }): Promise<ActionResult<Mute>> => {
    const user = await getSessionUser()
    if (!user) return UNAUTHORIZED
    return setMuted(user, data.kind, data.value, data.muted)
  })

import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { z } from 'zod'
import type { ActionResult, ConversationDetail, Inbox, Message, MessagePage } from '@/lib/types'
import { LIMITS, MAX_GROUP_MEMBERS, MESSAGE_REACTIONS } from '@/lib/constants'
import { isValidId } from '@/lib/url'
import {
  addMembers,
  deleteMessage,
  editMessage,
  getConversation,
  getUnreadCount,
  leaveConversation,
  listInbox,
  listMessages,
  markRead,
  removeMember,
  renameConversation,
  sendMessage,
  setMuted,
  shareStory,
  startConversation,
  toggleReaction,
} from '@/server/messages.server'
import { getSessionUser } from '@/server/session.server'

const id = z.string().refine(isValidId, 'Invalid id')
const people = z.array(id).max(MAX_GROUP_MEMBERS)
const UNAUTHORIZED = { ok: false, code: 'unauthorized', error: 'Please sign in to send messages.' } as const

/** Run a mutation as the verified signed-in user. */
async function asUser<T>(
  run: (user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>) => Promise<ActionResult<T>>,
) {
  const user = await getSessionUser({ fresh: true })
  if (!user) return UNAUTHORIZED
  return run(user)
}

/* ──────────────────────────────────── Reads ──────────────────────────────────── */

export const fetchInbox = createServerFn({ method: 'GET' }).handler(async (): Promise<Inbox | null> => {
  const user = await getSessionUser()
  return user ? listInbox(user) : null
})

export const fetchUnreadCount = createServerFn({ method: 'GET' }).handler(async (): Promise<number> => {
  const user = await getSessionUser()
  return user ? getUnreadCount(user) : 0
})

export const fetchConversation = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().max(64) }))
  .handler(async ({ data }): Promise<ConversationDetail> => {
    const user = await getSessionUser()
    if (!user || !isValidId(data.id)) throw notFound()
    const detail = await getConversation(user, data.id)
    if (!detail) throw notFound()
    return detail
  })

export const fetchMessages = createServerFn({ method: 'GET' })
  .validator(z.object({ id, before: id.optional() }))
  .handler(async ({ data }): Promise<MessagePage> => {
    const user = await getSessionUser()
    if (!user) throw notFound()
    const page = await listMessages(user, data.id, data.before)
    if (!page) throw notFound()
    return page
  })

/* ────────────────────────────────── Mutations ────────────────────────────────── */

export const createConversation = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      userIds: people.min(1, 'Pick someone to message.'),
      name: z.string().max(LIMITS.groupNameMax).optional(),
    }),
  )
  .handler(({ data }) => asUser((user) => startConversation(user, data)))

export const postMessage = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      conversationId: id,
      content: z.string().max(LIMITS.messageMax, `Messages can be up to ${LIMITS.messageMax} characters.`),
      replyToId: id.optional(),
      postId: id.optional(),
    }),
  )
  .handler(({ data }): Promise<ActionResult<Message>> => asUser((user) => sendMessage(user, data)))

export const updateMessage = createServerFn({ method: 'POST' })
  .validator(z.object({ messageId: id, content: z.string().max(LIMITS.messageMax) }))
  .handler(({ data }) => asUser((user) => editMessage(user, data.messageId, data.content)))

export const removeMessage = createServerFn({ method: 'POST' })
  .validator(z.object({ messageId: id }))
  .handler(({ data }) => asUser((user) => deleteMessage(user, data.messageId)))

export const reactToMessage = createServerFn({ method: 'POST' })
  .validator(z.object({ messageId: id, emoji: z.enum(MESSAGE_REACTIONS) }))
  .handler(({ data }) => asUser((user) => toggleReaction(user, data.messageId, data.emoji)))

export const readConversation = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: id }))
  .handler(({ data }) => asUser((user) => markRead(user, data.conversationId)))

export const muteConversation = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: id, muted: z.boolean() }))
  .handler(({ data }) => asUser((user) => setMuted(user, data.conversationId, data.muted)))

export const renameGroup = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: id, name: z.string().max(LIMITS.groupNameMax) }))
  .handler(({ data }) => asUser((user) => renameConversation(user, data.conversationId, data.name)))

export const addGroupMembers = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: id, userIds: people.min(1) }))
  .handler(({ data }) => asUser((user) => addMembers(user, data.conversationId, data.userIds)))

export const removeGroupMember = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: id, userId: id }))
  .handler(({ data }) => asUser((user) => removeMember(user, data.conversationId, data.userId)))

export const leaveGroup = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: id }))
  .handler(({ data }) => asUser((user) => leaveConversation(user, data.conversationId)))

export const shareStoryInMessages = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      postId: id,
      conversationIds: z.array(id).max(10),
      userIds: z.array(id).max(10),
      note: z.string().max(LIMITS.messageMax),
    }),
  )
  .handler(({ data }) => asUser((user) => shareStory(user, data)))

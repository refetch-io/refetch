import { AppwriteException, ID } from 'node-appwrite'
import type {
  ActionResult,
  ConversationDetail,
  ConversationMember,
  ConversationRole,
  ConversationSummary,
  ConversationType,
  Inbox,
  Message,
  MessagePage,
  PersonSummary,
  SessionUser,
} from '@/lib/types'
import { LIMITS, MAX_GROUP_MEMBERS, MESSAGE_REACTIONS } from '@/lib/constants'
import { hostnameOf } from '@/lib/url'
import { isBotUser } from '@/lib/utils'
import { isNotFound } from './appwrite.server'
import { Query, chunk, db, type Row } from './db.server'
import { getPeople, isBlocked, isBlockedEitherWay } from './profiles.server'

/*
 * Direct and group conversations. Every table is server-only: these functions
 * check membership on each call. Inbox order and unread counts are kept on the
 * member rows (`lastMessageAt`, `unreadCount`) so the inbox is a single query.
 */

const PAGE_SIZE = 40
const INBOX_SIZE = 60
const PREVIEW_MAX = 140
const MAX_MESSAGES_PER_MINUTE = 30
const MAX_NEW_CONVERSATIONS_PER_HOUR = 15
const MAX_SHARE_TARGETS = 10

const NOT_A_MEMBER = { ok: false, error: 'You’re not part of this conversation.' } as const

/* ─────────────────────────────────── Rows ─────────────────────────────────── */

function now() {
  return new Date().toISOString()
}

function directKey(a: string, b: string) {
  return [a, b].sort().join(':')
}

function preview(text: string) {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > PREVIEW_MAX ? `${flat.slice(0, PREVIEW_MAX - 1)}…` : flat
}

async function getRow(tableId: string, rowId: string): Promise<Row | null> {
  const { tables, ids } = db()
  return tables
    .getRow({ databaseId: ids.databaseId, tableId, rowId })
    .then((row) => row as Row)
    .catch((error: unknown) => {
      if (isNotFound(error)) return null
      throw error
    })
}

async function getMember(conversationId: string, userId: string): Promise<Row | null> {
  const { tables, ids } = db()
  const result = await tables.listRows({
    databaseId: ids.databaseId,
    tableId: ids.conversationMembers,
    queries: [Query.equal('conversationId', conversationId), Query.equal('userId', userId), Query.limit(1)],
    total: false,
  })
  return (result.rows[0] as Row | undefined) ?? null
}

async function listMembers(conversationIds: Array<string>): Promise<Array<Row>> {
  if (conversationIds.length === 0) return []
  const { tables, ids } = db()
  const pages = await Promise.all(
    chunk(conversationIds, 50).map((batch) =>
      tables.listRows({
        databaseId: ids.databaseId,
        tableId: ids.conversationMembers,
        queries: [
          Query.equal('conversationId', batch),
          Query.orderAsc('$createdAt'),
          Query.limit(Math.min(5000, batch.length * MAX_GROUP_MEMBERS)),
        ],
        total: false,
      }),
    ),
  )
  return pages.flatMap((page) => page.rows as Array<Row>)
}

async function rowsById(tableId: string, rowIds: Array<string>, select?: Array<string>) {
  const unique = [...new Set(rowIds.filter(Boolean))]
  const map = new Map<string, Row>()
  if (unique.length === 0) return map
  const { tables, ids } = db()
  const pages = await Promise.all(
    chunk(unique, 100).map((batch) =>
      tables
        .listRows({
          databaseId: ids.databaseId,
          tableId,
          queries: [
            Query.equal('$id', batch),
            Query.limit(batch.length),
            ...(select ? [Query.select(select)] : []),
          ],
          total: false,
        })
        .catch(() => ({ rows: [] as Array<Row> })),
    ),
  )
  for (const page of pages) for (const row of page.rows as Array<Row>) map.set(row.$id, row)
  return map
}

/* ──────────────────────────────── Shaping ──────────────────────────────── */

function listNames(names: Array<string>) {
  if (names.length === 0) return 'Just you'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]}`
  return `${names[0]}, ${names[1]} and ${names.length - 2} others`
}

function toSummary(
  conversation: Row,
  memberRows: Array<Row>,
  viewer: Row,
  people: Map<string, PersonSummary>,
): ConversationSummary {
  const members = memberRows.map(
    (row) => people.get(String(row.userId)) ?? { id: String(row.userId), name: 'Refetch user' },
  )
  const others = members.filter((member) => member.id !== viewer.userId)
  const type: ConversationType = conversation.type === 'group' ? 'group' : 'direct'
  const name = typeof conversation.name === 'string' && conversation.name ? conversation.name : null
  const title =
    type === 'direct' ? (others[0]?.name ?? 'Conversation') : (name ?? listNames(others.map((o) => o.name)))
  const lastAt = typeof conversation.lastMessageAt === 'string' ? conversation.lastMessageAt : null
  return {
    id: conversation.$id,
    type,
    title,
    name,
    members,
    lastMessage:
      lastAt && conversation.lastMessageUserId
        ? {
            preview: String(conversation.lastMessagePreview ?? ''),
            userId: String(conversation.lastMessageUserId),
            at: lastAt,
          }
        : null,
    unread: typeof viewer.unreadCount === 'number' ? viewer.unreadCount : 0,
    muted: viewer.muted === true,
    updatedAt: lastAt ?? conversation.$createdAt,
  }
}

function toMessages(
  rows: Array<Row>,
  replies: Map<string, Row>,
  stories: Map<string, Row>,
  reactions: Array<Row>,
): Array<Message> {
  const byMessage = new Map<string, Map<string, Array<string>>>()
  for (const reaction of reactions) {
    const messageId = String(reaction.messageId)
    const emojis = byMessage.get(messageId) ?? new Map<string, Array<string>>()
    const users = emojis.get(String(reaction.emoji)) ?? []
    users.push(String(reaction.userId))
    emojis.set(String(reaction.emoji), users)
    byMessage.set(messageId, emojis)
  }

  return rows.map((row) => {
    const deleted = row.deleted === true
    const reply = row.replyToId ? replies.get(String(row.replyToId)) : undefined
    const story = row.postId && !deleted ? stories.get(String(row.postId)) : undefined
    const link = typeof story?.link === 'string' ? story.link : null
    return {
      id: row.$id,
      userId: String(row.userId),
      kind: row.kind === 'system' ? 'system' : 'text',
      content: deleted ? '' : String(row.content ?? ''),
      createdAt: row.$createdAt,
      editedAt: typeof row.editedAt === 'string' ? row.editedAt : null,
      deleted,
      replyTo: reply
        ? {
            id: reply.$id,
            userId: String(reply.userId),
            content: reply.deleted === true ? '' : preview(String(reply.content ?? '')),
            deleted: reply.deleted === true,
          }
        : null,
      story: story
        ? {
            id: story.$id,
            title: String(story.title ?? ''),
            domain: hostnameOf(link),
            count: typeof story.count === 'number' ? story.count : 0,
            countComments: typeof story.countComments === 'number' ? story.countComments : 0,
          }
        : null,
      reactions: [...(byMessage.get(row.$id) ?? new Map<string, Array<string>>())].map(
        ([emoji, userIds]) => ({ emoji, userIds }),
      ),
    }
  })
}

/** Replies, shared stories and reactions for a set of message rows. */
async function hydrate(rows: Array<Row>): Promise<Array<Message>> {
  const { tables, ids } = db()
  const known = new Map(rows.map((row) => [row.$id, row]))
  const replyIds = rows.map((row) => String(row.replyToId ?? '')).filter((id) => id && !known.has(id))
  const [extraReplies, stories, reactions] = await Promise.all([
    rowsById(ids.messages, replyIds),
    rowsById(
      ids.posts,
      rows.map((row) => String(row.postId ?? '')),
      ['$id', 'title', 'link', 'count', 'countComments'],
    ),
    rows.length === 0
      ? Promise.resolve([] as Array<Row>)
      : tables
          .listRows({
            databaseId: ids.databaseId,
            tableId: ids.messageReactions,
            queries: [
              Query.equal(
                'messageId',
                rows.map((row) => row.$id),
              ),
              Query.limit(1000),
            ],
            total: false,
          })
          .then((result) => result.rows as Array<Row>)
          .catch(() => [] as Array<Row>),
  ])
  const replies = new Map([...known, ...extraReplies])
  return toMessages(rows, replies, stories, reactions)
}

/* ──────────────────────────────────── Reads ──────────────────────────────────── */

export async function listInbox(user: SessionUser): Promise<Inbox> {
  const { tables, ids } = db()
  const mine = (
    await tables.listRows({
      databaseId: ids.databaseId,
      tableId: ids.conversationMembers,
      queries: [Query.equal('userId', user.id), Query.orderDesc('lastMessageAt'), Query.limit(INBOX_SIZE)],
      total: false,
    })
  ).rows as Array<Row>
  if (mine.length === 0) return { conversations: [], unread: 0 }

  const conversationIds = mine.map((row) => String(row.conversationId))
  const [conversations, members] = await Promise.all([
    rowsById(ids.conversations, conversationIds),
    listMembers(conversationIds),
  ])
  const people = await getPeople(members.map((row) => String(row.userId)))

  const summaries: Array<ConversationSummary> = []
  for (const viewer of mine) {
    const conversation = conversations.get(String(viewer.conversationId))
    if (!conversation) continue
    summaries.push(
      toSummary(
        conversation,
        members.filter((row) => row.conversationId === conversation.$id),
        viewer,
        people,
      ),
    )
  }
  return {
    conversations: summaries,
    unread: summaries.reduce((sum, item) => sum + (item.muted ? 0 : item.unread), 0),
  }
}

/** Unread messages across conversations that aren't muted (for the nav badge). */
export async function getUnreadCount(user: SessionUser): Promise<number> {
  const { tables, ids } = db()
  const result = await tables
    .listRows({
      databaseId: ids.databaseId,
      tableId: ids.conversationMembers,
      queries: [
        Query.equal('userId', user.id),
        Query.greaterThan('unreadCount', 0),
        Query.limit(100),
        Query.select(['unreadCount', 'muted']),
      ],
      total: false,
    })
    .catch(() => ({ rows: [] as Array<Row> }))
  return (result.rows as Array<Row>).reduce(
    (sum, row) => sum + (row.muted === true ? 0 : Number(row.unreadCount) || 0),
    0,
  )
}

export async function getConversation(
  user: SessionUser,
  conversationId: string,
): Promise<ConversationDetail | null> {
  const viewer = await getMember(conversationId, user.id)
  if (!viewer) return null
  const [conversation, memberRows] = await Promise.all([
    getRow(db().ids.conversations, conversationId),
    listMembers([conversationId]),
  ])
  if (!conversation) return null
  const people = await getPeople(memberRows.map((row) => String(row.userId)))
  const summary = toSummary(conversation, memberRows, viewer, people)

  let readOnlyReason: string | null = null
  if (summary.type === 'direct') {
    const other = summary.members.find((member) => member.id !== user.id)
    if (!other) readOnlyReason = 'This person is no longer in the conversation.'
    else if (await isBlocked(user.id, other.id)) {
      readOnlyReason = `You blocked ${other.name}. Unblock them to send messages.`
    } else if (await isBlocked(other.id, user.id)) {
      readOnlyReason = 'You can’t reply to this conversation.'
    }
  }

  const members: Array<ConversationMember> = memberRows.map((row) => ({
    ...(people.get(String(row.userId)) ?? { id: String(row.userId), name: 'Refetch user' }),
    role: row.role === 'owner' ? 'owner' : 'member',
    lastReadAt: typeof row.lastReadAt === 'string' ? row.lastReadAt : null,
  }))

  return {
    conversation: summary,
    members,
    role: viewer.role === 'owner' ? 'owner' : 'member',
    readOnlyReason,
  }
}

export async function listMessages(
  user: SessionUser,
  conversationId: string,
  before?: string,
): Promise<MessagePage | null> {
  if (!(await getMember(conversationId, user.id))) return null
  const { tables, ids } = db()
  const result = await tables.listRows({
    databaseId: ids.databaseId,
    tableId: ids.messages,
    queries: [
      Query.equal('conversationId', conversationId),
      Query.orderDesc('$createdAt'),
      Query.limit(PAGE_SIZE + 1),
      ...(before ? [Query.cursorAfter(before)] : []),
    ],
    total: false,
  })
  const rows = (result.rows as Array<Row>).slice(0, PAGE_SIZE).reverse()
  return { messages: await hydrate(rows), hasMore: result.rows.length > PAGE_SIZE }
}

/* ─────────────────────────────── Writes: helpers ─────────────────────────────── */

/**
 * Record a new last message: the conversation's preview, every member's inbox
 * order, unread counts for everyone else and read state for the sender.
 */
async function touchConversation(
  conversationId: string,
  memberRows: Array<Row>,
  message: { id: string; userId: string; preview: string; at: string },
  countUnread: boolean,
) {
  const { tables, ids } = db()
  const base = { databaseId: ids.databaseId, tableId: ids.conversationMembers }
  await Promise.all([
    tables.updateRow({
      databaseId: ids.databaseId,
      tableId: ids.conversations,
      rowId: conversationId,
      data: {
        lastMessageAt: message.at,
        lastMessageId: message.id,
        lastMessagePreview: message.preview,
        lastMessageUserId: message.userId,
      },
    }),
    ...memberRows.map(async (row) => {
      if (row.userId === message.userId) {
        await tables.updateRow({
          ...base,
          rowId: row.$id,
          data: { lastMessageAt: message.at, lastReadAt: message.at, unreadCount: 0 },
        })
        return
      }
      await tables.updateRow({ ...base, rowId: row.$id, data: { lastMessageAt: message.at } })
      if (countUnread) {
        await tables.incrementRowColumn({ ...base, rowId: row.$id, column: 'unreadCount', value: 1 })
      }
    }),
  ])
}

async function postSystemMessage(conversationId: string, actor: SessionUser, text: string) {
  const { tables, ids } = db()
  const row = await tables.createRow({
    databaseId: ids.databaseId,
    tableId: ids.messages,
    rowId: ID.unique(),
    data: { conversationId, userId: actor.id, kind: 'system', content: text, deleted: false },
  })
  await touchConversation(
    conversationId,
    await listMembers([conversationId]),
    { id: row.$id, userId: actor.id, preview: preview(text), at: row.$createdAt },
    false,
  )
}

async function recentCount(tableId: string, queries: Array<string>, windowMs: number, limit: number) {
  const { tables, ids } = db()
  return tables
    .listRows({
      databaseId: ids.databaseId,
      tableId,
      queries: [
        ...queries,
        Query.greaterThan('$createdAt', new Date(Date.now() - windowMs).toISOString()),
        Query.limit(limit + 1),
        Query.select(['$id']),
      ],
      total: false,
    })
    .then((result) => result.rows.length)
    .catch(() => 0)
}

/**
 * Check that `adder` may bring each person into a conversation: they have a
 * profile (they've signed in), accept messages and neither side blocked the other.
 */
async function checkRecipients(
  adder: SessionUser,
  userIds: Array<string>,
  options: { ignorePrivacy?: boolean } = {},
): Promise<{ ok: true; people: Map<string, Row> } | { ok: false; error: string }> {
  const { ids } = db()
  const people = await rowsById(ids.profiles, userIds, ['$id', 'name', 'allowMessages'])
  for (const id of userIds) {
    const person = people.get(id)
    if (!person || isBotUser(id)) {
      return { ok: false, error: 'Some of these people can’t receive messages yet.' }
    }
    if (!options.ignorePrivacy && person.allowMessages === 'nobody') {
      return { ok: false, error: `${person.name} isn’t accepting messages.` }
    }
    if (await isBlockedEitherWay(adder.id, id)) {
      return { ok: false, error: `You can’t message ${person.name}.` }
    }
  }
  return { ok: true, people }
}

/* ──────────────────────────────── Conversations ──────────────────────────────── */

export async function startConversation(
  user: SessionUser,
  input: { userIds: Array<string>; name?: string },
): Promise<ActionResult<{ id: string }>> {
  const { tables, ids } = db()
  const others = [...new Set(input.userIds)].filter((id) => id && id !== user.id)
  if (others.length === 0) return { ok: false, error: 'Pick someone to message.' }
  if (others.length + 1 > MAX_GROUP_MEMBERS) {
    return { ok: false, error: `Groups can have up to ${MAX_GROUP_MEMBERS} people.` }
  }
  const type: ConversationType = others.length === 1 ? 'direct' : 'group'
  const key = type === 'direct' ? directKey(user.id, others[0]) : null

  // An existing direct conversation is reused, even if they've since closed DMs.
  if (key) {
    const existing = await findDirect(key)
    if (existing) {
      if (await isBlockedEitherWay(user.id, others[0])) {
        return { ok: false, error: 'You can’t message this person.' }
      }
      return { ok: true, data: { id: existing.$id } }
    }
  }

  const check = await checkRecipients(user, others)
  if (!check.ok) return check

  const created = await recentCount(
    ids.conversations,
    [Query.equal('createdBy', user.id)],
    60 * 60 * 1000,
    MAX_NEW_CONVERSATIONS_PER_HOUR,
  )
  if (created >= MAX_NEW_CONVERSATIONS_PER_HOUR) {
    return {
      ok: false,
      code: 'rate_limited',
      error: 'You’ve started a lot of conversations recently. Try again in a little while.',
    }
  }

  const at = now()
  const name = type === 'group' ? (input.name ?? '').trim().slice(0, LIMITS.groupNameMax) : ''
  let conversation: Row
  try {
    conversation = (await tables.createRow({
      databaseId: ids.databaseId,
      tableId: ids.conversations,
      rowId: ID.unique(),
      data: {
        type,
        name: name || null,
        createdBy: user.id,
        directKey: key,
        lastMessageAt: at,
        lastMessagePreview: '',
        lastMessageUserId: '',
        memberCount: others.length + 1,
      },
    })) as Row
  } catch (error) {
    // Both people opened a DM at the same moment: the unique key picked one.
    if (key && error instanceof AppwriteException && error.code === 409) {
      const existing = await findDirect(key)
      if (existing) return { ok: true, data: { id: existing.$id } }
    }
    throw error
  }

  await Promise.all(
    [user.id, ...others].map((userId) =>
      tables.createRow({
        databaseId: ids.databaseId,
        tableId: ids.conversationMembers,
        rowId: ID.unique(),
        data: {
          conversationId: conversation.$id,
          userId,
          role: type === 'group' && userId === user.id ? 'owner' : 'member',
          lastMessageAt: at,
          lastReadAt: userId === user.id ? at : null,
          unreadCount: 0,
          muted: false,
        },
      }),
    ),
  )

  if (type === 'group') {
    const names = others.map((id) => String(check.people.get(id)?.name ?? 'someone'))
    await postSystemMessage(
      conversation.$id,
      user,
      name
        ? `${user.name} created “${name}” with ${listNames(names)}`
        : `${user.name} started a group with ${listNames(names)}`,
    )
  }
  return { ok: true, data: { id: conversation.$id } }
}

async function findDirect(key: string): Promise<Row | null> {
  const { tables, ids } = db()
  const result = await tables.listRows({
    databaseId: ids.databaseId,
    tableId: ids.conversations,
    queries: [Query.equal('directKey', key), Query.limit(1)],
    total: false,
  })
  return (result.rows[0] as Row | undefined) ?? null
}

async function requireGroup(user: SessionUser, conversationId: string) {
  const [viewer, conversation] = await Promise.all([
    getMember(conversationId, user.id),
    getRow(db().ids.conversations, conversationId),
  ])
  if (!viewer || !conversation) return null
  return { viewer, conversation, isGroup: conversation.type === 'group' }
}

export async function renameConversation(
  user: SessionUser,
  conversationId: string,
  name: string,
): Promise<ActionResult> {
  const context = await requireGroup(user, conversationId)
  if (!context) return NOT_A_MEMBER
  if (!context.isGroup) return { ok: false, error: 'Only groups have names.' }
  const next = name.trim().slice(0, LIMITS.groupNameMax)
  if (next === (context.conversation.name ?? '')) return { ok: true, data: undefined }
  const { tables, ids } = db()
  await tables.updateRow({
    databaseId: ids.databaseId,
    tableId: ids.conversations,
    rowId: conversationId,
    data: { name: next || null },
  })
  await postSystemMessage(
    conversationId,
    user,
    next ? `${user.name} named the group “${next}”` : `${user.name} removed the group name`,
  )
  return { ok: true, data: undefined }
}

export async function addMembers(
  user: SessionUser,
  conversationId: string,
  userIds: Array<string>,
): Promise<ActionResult> {
  const context = await requireGroup(user, conversationId)
  if (!context) return NOT_A_MEMBER
  if (!context.isGroup) return { ok: false, error: 'Start a group to add more people.' }

  const current = await listMembers([conversationId])
  const present = new Set(current.map((row) => String(row.userId)))
  const added = [...new Set(userIds)].filter((id) => id && !present.has(id))
  if (added.length === 0) return { ok: true, data: undefined }
  if (current.length + added.length > MAX_GROUP_MEMBERS) {
    return { ok: false, error: `Groups can have up to ${MAX_GROUP_MEMBERS} people.` }
  }
  const check = await checkRecipients(user, added)
  if (!check.ok) return check

  const { tables, ids } = db()
  const at = now()
  await Promise.all(
    added.map((userId) =>
      tables.createRow({
        databaseId: ids.databaseId,
        tableId: ids.conversationMembers,
        rowId: ID.unique(),
        data: {
          conversationId,
          userId,
          role: 'member',
          lastMessageAt: at,
          lastReadAt: null,
          unreadCount: 0,
          muted: false,
        },
      }),
    ),
  )
  await tables.updateRow({
    databaseId: ids.databaseId,
    tableId: ids.conversations,
    rowId: conversationId,
    data: { memberCount: current.length + added.length },
  })
  await postSystemMessage(
    conversationId,
    user,
    `${user.name} added ${listNames(added.map((id) => String(check.people.get(id)?.name ?? 'someone')))}`,
  )
  return { ok: true, data: undefined }
}

export async function removeMember(
  user: SessionUser,
  conversationId: string,
  userId: string,
): Promise<ActionResult> {
  const context = await requireGroup(user, conversationId)
  if (!context) return NOT_A_MEMBER
  if (!context.isGroup) return { ok: false, error: 'You can only remove people from groups.' }
  if ((context.viewer.role as ConversationRole) !== 'owner') {
    return { ok: false, error: 'Only the group’s owner can remove people.' }
  }
  if (userId === user.id) return leaveConversation(user, conversationId)
  const target = await getMember(conversationId, userId)
  if (!target) return { ok: true, data: undefined }

  const { tables, ids } = db()
  await tables.deleteRow({ databaseId: ids.databaseId, tableId: ids.conversationMembers, rowId: target.$id })
  await tables.decrementRowColumn({
    databaseId: ids.databaseId,
    tableId: ids.conversations,
    rowId: conversationId,
    column: 'memberCount',
    value: 1,
    min: 0,
  })
  const people = await getPeople([userId])
  await postSystemMessage(
    conversationId,
    user,
    `${user.name} removed ${people.get(userId)?.name ?? 'someone'}`,
  )
  return { ok: true, data: undefined }
}

export async function leaveConversation(user: SessionUser, conversationId: string): Promise<ActionResult> {
  const context = await requireGroup(user, conversationId)
  if (!context) return NOT_A_MEMBER
  if (!context.isGroup) {
    return { ok: false, error: 'You can’t leave a direct conversation. Mute or block instead.' }
  }
  const { tables, ids } = db()
  await tables.deleteRow({
    databaseId: ids.databaseId,
    tableId: ids.conversationMembers,
    rowId: context.viewer.$id,
  })
  const remaining = await listMembers([conversationId])
  if (remaining.length === 0) {
    await tables.deleteRow({ databaseId: ids.databaseId, tableId: ids.conversations, rowId: conversationId })
    return { ok: true, data: undefined }
  }
  await tables.updateRow({
    databaseId: ids.databaseId,
    tableId: ids.conversations,
    rowId: conversationId,
    data: { memberCount: remaining.length },
  })
  // Hand the group to whoever has been in it longest.
  if (context.viewer.role === 'owner' && !remaining.some((row) => row.role === 'owner')) {
    await tables.updateRow({
      databaseId: ids.databaseId,
      tableId: ids.conversationMembers,
      rowId: remaining[0].$id,
      data: { role: 'owner' },
    })
  }
  await postSystemMessage(conversationId, user, `${user.name} left the group`)
  return { ok: true, data: undefined }
}

export async function setMuted(
  user: SessionUser,
  conversationId: string,
  muted: boolean,
): Promise<ActionResult> {
  const viewer = await getMember(conversationId, user.id)
  if (!viewer) return NOT_A_MEMBER
  const { tables, ids } = db()
  await tables.updateRow({
    databaseId: ids.databaseId,
    tableId: ids.conversationMembers,
    rowId: viewer.$id,
    data: { muted },
  })
  return { ok: true, data: undefined }
}

export async function markRead(user: SessionUser, conversationId: string): Promise<ActionResult> {
  const viewer = await getMember(conversationId, user.id)
  if (!viewer) return NOT_A_MEMBER
  const { tables, ids } = db()
  await tables.updateRow({
    databaseId: ids.databaseId,
    tableId: ids.conversationMembers,
    rowId: viewer.$id,
    data: { lastReadAt: now(), unreadCount: 0 },
  })
  return { ok: true, data: undefined }
}

/* ─────────────────────────────────── Messages ─────────────────────────────────── */

export interface SendInput {
  conversationId: string
  content: string
  replyToId?: string
  postId?: string
}

export async function sendMessage(user: SessionUser, input: SendInput): Promise<ActionResult<Message>> {
  const { tables, ids } = db()
  const content = input.content.trim()
  if (!content && !input.postId) return { ok: false, error: 'Write a message first.' }

  const [viewer, conversation, memberRows] = await Promise.all([
    getMember(input.conversationId, user.id),
    getRow(ids.conversations, input.conversationId),
    listMembers([input.conversationId]),
  ])
  if (!viewer || !conversation) return NOT_A_MEMBER

  if (conversation.type !== 'group') {
    const other = memberRows.find((row) => row.userId !== user.id)
    if (!other || (await isBlockedEitherWay(user.id, String(other.userId)))) {
      return { ok: false, error: 'You can’t send messages in this conversation.' }
    }
  }

  const [sent, reply, story] = await Promise.all([
    recentCount(ids.messages, [Query.equal('userId', user.id)], 60_000, MAX_MESSAGES_PER_MINUTE),
    input.replyToId ? getRow(ids.messages, input.replyToId) : Promise.resolve(null),
    input.postId ? getRow(ids.posts, input.postId) : Promise.resolve(null),
  ])
  if (sent >= MAX_MESSAGES_PER_MINUTE) {
    return { ok: false, code: 'rate_limited', error: 'You’re sending messages too quickly. Wait a moment.' }
  }
  if (input.replyToId && reply?.conversationId !== input.conversationId) {
    return { ok: false, error: 'The message you’re replying to is gone.' }
  }
  if (input.postId && !story) return { ok: false, error: 'This story no longer exists.' }

  const row = (await tables.createRow({
    databaseId: ids.databaseId,
    tableId: ids.messages,
    rowId: ID.unique(),
    data: {
      conversationId: input.conversationId,
      userId: user.id,
      kind: 'text',
      content,
      replyToId: input.replyToId ?? '',
      postId: input.postId ?? '',
      deleted: false,
    },
  })) as Row

  await touchConversation(
    input.conversationId,
    memberRows,
    {
      id: row.$id,
      userId: user.id,
      preview: preview(content || `Shared “${String(story?.title ?? 'a story')}”`),
      at: row.$createdAt,
    },
    true,
  )

  const [message] = toMessages(
    [row],
    new Map(reply ? [[reply.$id, reply]] : []),
    new Map(story ? [[story.$id, story]] : []),
    [],
  )
  return { ok: true, data: message }
}

async function ownMessage(user: SessionUser, messageId: string) {
  const message = await getRow(db().ids.messages, messageId)
  if (!message || message.userId !== user.id || message.kind === 'system') return null
  return message
}

/** Keep the inbox preview right when the latest message changes. */
async function refreshPreview(message: Row, text: string) {
  const { tables, ids } = db()
  const conversation = await getRow(ids.conversations, String(message.conversationId))
  if (conversation?.lastMessageId !== message.$id) return
  await tables.updateRow({
    databaseId: ids.databaseId,
    tableId: ids.conversations,
    rowId: conversation.$id,
    data: { lastMessagePreview: preview(text) },
  })
}

export async function editMessage(
  user: SessionUser,
  messageId: string,
  content: string,
): Promise<ActionResult> {
  const message = await ownMessage(user, messageId)
  if (!message || message.deleted === true)
    return { ok: false, error: 'You can only edit your own messages.' }
  const next = content.trim()
  if (!next && !message.postId) return { ok: false, error: 'A message can’t be empty. Delete it instead.' }
  if (next === message.content) return { ok: true, data: undefined }
  const { tables, ids } = db()
  await tables.updateRow({
    databaseId: ids.databaseId,
    tableId: ids.messages,
    rowId: messageId,
    data: { content: next, editedAt: now() },
  })
  await refreshPreview(message, next || 'Shared a story')
  return { ok: true, data: undefined }
}

export async function deleteMessage(user: SessionUser, messageId: string): Promise<ActionResult> {
  const message = await ownMessage(user, messageId)
  if (!message) return { ok: false, error: 'You can only delete your own messages.' }
  if (message.deleted === true) return { ok: true, data: undefined }
  const { tables, ids } = db()
  await tables.updateRow({
    databaseId: ids.databaseId,
    tableId: ids.messages,
    rowId: messageId,
    data: { deleted: true, content: '', postId: '' },
  })
  await refreshPreview(message, 'Message deleted')
  return { ok: true, data: undefined }
}

export async function toggleReaction(
  user: SessionUser,
  messageId: string,
  emoji: string,
): Promise<ActionResult> {
  if (!(MESSAGE_REACTIONS as ReadonlyArray<string>).includes(emoji)) {
    return { ok: false, error: 'That reaction isn’t available.' }
  }
  const { tables, ids } = db()
  const message = await getRow(ids.messages, messageId)
  if (!message || message.deleted === true || message.kind === 'system') {
    return { ok: false, error: 'This message can’t be reacted to.' }
  }
  if (!(await getMember(String(message.conversationId), user.id))) return NOT_A_MEMBER

  const existing = await tables.listRows({
    databaseId: ids.databaseId,
    tableId: ids.messageReactions,
    queries: [
      Query.equal('messageId', messageId),
      Query.equal('userId', user.id),
      Query.equal('emoji', emoji),
      Query.limit(1),
    ],
    total: false,
  })
  if (existing.rows.length > 0) {
    await tables.deleteRow({
      databaseId: ids.databaseId,
      tableId: ids.messageReactions,
      rowId: existing.rows[0].$id,
    })
    return { ok: true, data: undefined }
  }
  await tables
    .createRow({
      databaseId: ids.databaseId,
      tableId: ids.messageReactions,
      rowId: ID.unique(),
      data: { messageId, conversationId: message.conversationId, userId: user.id, emoji },
    })
    .catch((error: unknown) => {
      if (!(error instanceof AppwriteException && error.code === 409)) throw error
    })
  return { ok: true, data: undefined }
}

/** Send a story to existing conversations and/or people (opening DMs as needed). */
export async function shareStory(
  user: SessionUser,
  input: { postId: string; conversationIds: Array<string>; userIds: Array<string>; note: string },
): Promise<ActionResult<{ sent: number; conversationId: string | null }>> {
  const targets = new Set(input.conversationIds)
  for (const userId of input.userIds) {
    const started = await startConversation(user, { userIds: [userId] })
    if (!started.ok) return started
    targets.add(started.data.id)
  }
  if (targets.size === 0) return { ok: false, error: 'Pick at least one conversation.' }
  if (targets.size > MAX_SHARE_TARGETS) {
    return { ok: false, error: `You can share with up to ${MAX_SHARE_TARGETS} conversations at once.` }
  }
  let sent = 0
  let lastError: string | null = null
  for (const conversationId of targets) {
    const result = await sendMessage(user, { conversationId, content: input.note, postId: input.postId })
    if (result.ok) sent++
    else lastError = result.error
  }
  if (sent === 0) return { ok: false, error: lastError ?? 'Couldn’t share this story.' }
  return { ok: true, data: { sent, conversationId: targets.size === 1 ? [...targets][0] : null } }
}

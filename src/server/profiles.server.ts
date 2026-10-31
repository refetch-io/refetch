import { AppwriteException, ID } from 'node-appwrite'
import type {
  ActionResult,
  MessagePrivacy,
  OnboardingSuggestions,
  PeoplePage,
  PersonSummary,
  Profile,
  SessionUser,
  SuggestedPerson,
  UserCommentsPage,
  Verification,
  VerifiedPeople,
} from '@/lib/types'
import { FEATURED_PEOPLE, FEED_PAGE_SIZE, ONBOARDING_CHANNELS } from '@/lib/constants'
import { isBotUser } from '@/lib/utils'
import { isNotFound } from './appwrite.server'
import { Query, chunk, db, type Row } from './db.server'
import { notify } from './notifications.server'

/*
 * Profiles live in the `profiles` table (row ID = user ID). The server API key
 * can't read Appwrite Users, so the row is written whenever someone signs in,
 * and people who haven't signed in since are described from their posts and
 * comments. Photos come from Appwrite Avatars (`/avatars/photo`).
 */

const BOT_PROFILE = {
  name: 'Scout',
  bio: 'Refetch’s scout. Finds stories from across the web, around the clock.',
}

/** Scout's user ID ("0") can't be a row ID, so its badge lives here with the rest of its profile. */
const BOT_VERIFICATION: Verification = { kind: 'bot', org: null }

function toVerification(row: Row | null): Verification | null {
  const kind = row?.verified
  if (kind !== 'bot' && kind !== 'refetcher') return null
  return { kind, org: typeof row?.org === 'string' && row.org ? row.org : null }
}

function toPrivacy(value: unknown): MessagePrivacy {
  return value === 'nobody' ? 'nobody' : 'everyone'
}

async function getProfileRow(userId: string): Promise<Row | null> {
  const { tables, ids } = db()
  return tables
    .getRow({ databaseId: ids.databaseId, tableId: ids.profiles, rowId: userId })
    .then((row) => row as Row)
    .catch((error: unknown) => {
      if (isNotFound(error)) return null
      throw error
    })
}

/** First sign-in: no profile row has been written for this account yet. */
export async function isNewMember(userId: string): Promise<boolean> {
  return (await getProfileRow(userId).catch(() => ({}) as Row)) === null
}

/* ──────────────────────────────── Sync on sign-in ──────────────────────────────── */

/** userId → name last written, so a busy server doesn't rewrite the same row. */
const synced = new Map<string, string>()
/** Past this, the oldest entries go; forgetting one only costs a redundant profile read. */
const SYNCED_MAX = 5_000

function markSynced(userId: string, name: string) {
  synced.delete(userId)
  synced.set(userId, name)
  if (synced.size > SYNCED_MAX) synced.delete(synced.keys().next().value!)
}

/** Create or refresh someone's profile from their account. Never throws. */
export async function syncProfile(user: SessionUser, registeredAt?: string) {
  if (!user.id || synced.get(user.id) === user.name) return
  const { tables, ids } = db()
  try {
    const row = await getProfileRow(user.id)
    if (!row) {
      await tables.createRow({
        databaseId: ids.databaseId,
        tableId: ids.profiles,
        rowId: user.id,
        data: {
          name: user.name || 'Refetch user',
          bio: '',
          website: '',
          allowMessages: 'everyone',
          joinedAt: registeredAt ?? new Date().toISOString(),
        },
      })
    } else if (row.name !== user.name && user.name) {
      await tables.updateRow({
        databaseId: ids.databaseId,
        tableId: ids.profiles,
        rowId: user.id,
        data: { name: user.name },
      })
    }
    markSynced(user.id, user.name)
  } catch (error) {
    // 409: another request created it first.
    if (error instanceof AppwriteException && error.code === 409) markSynced(user.id, user.name)
    else console.error('[profiles] sync failed', error)
  }
}

/* ──────────────────────────────────── Reads ──────────────────────────────────── */

const VERIFIED_TTL = 60_000
let verified: { people: VerifiedPeople; expires: number } | null = null

/** Everyone with a badge (a handful, set by hand in the database), cached briefly. */
export async function listVerifiedPeople(): Promise<VerifiedPeople> {
  if (verified && verified.expires > Date.now()) return verified.people
  const { tables, ids } = db()
  try {
    const result = await tables.listRows({
      databaseId: ids.databaseId,
      tableId: ids.profiles,
      queries: [Query.isNotNull('verified'), Query.limit(500), Query.select(['$id', 'verified', 'org'])],
      total: false,
    })
    const people: VerifiedPeople = { '0': BOT_VERIFICATION }
    for (const row of result.rows as Array<Row>) {
      const badge = toVerification(row)
      if (badge) people[row.$id] = badge
    }
    verified = { people, expires: Date.now() + VERIFIED_TTL }
    return people
  } catch (error) {
    console.error('[profiles] failed to load verified people', error)
    return verified?.people ?? { '0': BOT_VERIFICATION }
  }
}

/** Names for a set of people, from profiles first, then their latest post or comment. */
export async function getPeople(userIds: Array<string>): Promise<Map<string, PersonSummary>> {
  const people = new Map<string, PersonSummary>()
  const unique = [...new Set(userIds.filter(Boolean))]
  if (unique.length === 0) return people
  const { tables, ids } = db()

  for (const batch of chunk(unique, 100)) {
    const result = await tables
      .listRows({
        databaseId: ids.databaseId,
        tableId: ids.profiles,
        queries: [Query.equal('$id', batch), Query.limit(batch.length), Query.select(['$id', 'name'])],
        total: false,
      })
      .catch(() => ({ rows: [] as Array<Row> }))
    for (const row of result.rows as Array<Row>) {
      people.set(row.$id, { id: row.$id, name: String(row.name || 'Refetch user') })
    }
  }

  const missing = unique.filter((id) => !people.has(id))
  await Promise.all(
    missing.map(async (id) => {
      if (isBotUser(id)) return people.set(id, { id, name: BOT_PROFILE.name })
      const name = await nameFromActivity(id)
      people.set(id, { id, name: name ?? 'Refetch user' })
    }),
  )
  return people
}

async function nameFromActivity(userId: string): Promise<string | null> {
  const { tables, ids } = db()
  for (const tableId of [ids.comments, ids.posts]) {
    const result = await tables
      .listRows({
        databaseId: ids.databaseId,
        tableId,
        queries: [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(1),
          Query.select(['userName']),
        ],
        total: false,
      })
      .catch(() => ({ rows: [] as Array<Row> }))
    const name = (result.rows[0] as Row | undefined)?.userName
    if (typeof name === 'string' && name) return name
  }
  return null
}

async function countRows(tableId: string, queries: Array<string>): Promise<number> {
  const { tables, ids } = db()
  const result = await tables
    .listRows({ databaseId: ids.databaseId, tableId, queries: [...queries, Query.limit(1)], total: true })
    .catch(() => ({ total: 0 }))
  return result.total
}

/** Karma: net votes across someone's stories (bounded scan). */
async function karmaFor(userId: string): Promise<number> {
  const { tables, ids } = db()
  const result = await tables
    .listRows({
      databaseId: ids.databaseId,
      tableId: ids.posts,
      queries: [Query.equal('userId', userId), Query.limit(1000), Query.select(['count'])],
      total: false,
    })
    .catch(() => ({ rows: [] as Array<Row> }))
  return (result.rows as Array<Row>).reduce(
    (sum, row) => sum + (typeof row.count === 'number' ? row.count : 0),
    0,
  )
}

export async function isBlocked(userId: string, otherId: string): Promise<boolean> {
  const { tables, ids } = db()
  const result = await tables
    .listRows({
      databaseId: ids.databaseId,
      tableId: ids.blocks,
      queries: [Query.equal('userId', userId), Query.equal('blockedUserId', otherId), Query.limit(1)],
      total: false,
    })
    .catch(() => ({ rows: [] }))
  return result.rows.length > 0
}

/** True when either person has blocked the other. */
export async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  const [ab, ba] = await Promise.all([isBlocked(a, b), isBlocked(b, a)])
  return ab || ba
}

export async function getProfile(userId: string, viewer: SessionUser | null): Promise<Profile | null> {
  const { ids } = db()
  const bot = isBotUser(userId)
  const [row, stories, comments, karma, fallbackName, followers, following] = await Promise.all([
    bot ? Promise.resolve(null) : getProfileRow(userId),
    countRows(ids.posts, [Query.equal('userId', userId)]),
    countRows(ids.comments, [Query.equal('userId', userId)]),
    karmaFor(userId),
    bot ? Promise.resolve(BOT_PROFILE.name) : nameFromActivity(userId),
    countRows(ids.follows, [Query.equal('userId', userId)]),
    countRows(ids.follows, [Query.equal('followerId', userId)]),
  ])

  // No profile and no trace of activity: there's nobody to show.
  if (!row && !fallbackName) return null

  const isSelf = viewer?.id === userId
  const allowMessages = toPrivacy(row?.allowMessages)
  let viewerState: Profile['viewer'] = null
  if (viewer) {
    const [blockedByMe, blockedMe, follows] = isSelf
      ? [false, false, false]
      : await Promise.all([
          isBlocked(viewer.id, userId),
          isBlocked(userId, viewer.id),
          getFollowedIds(viewer.id).then((ids) => ids.includes(userId)),
        ])
    viewerState = {
      isSelf,
      blocked: blockedByMe,
      following: follows,
      // Only people with a profile (who have signed in) can receive messages.
      canMessage:
        !isSelf && !bot && Boolean(row) && allowMessages === 'everyone' && !blockedByMe && !blockedMe,
    }
  }

  return {
    id: userId,
    name: String(row?.name || fallbackName || 'Refetch user'),
    bio: bot ? BOT_PROFILE.bio : String(row?.bio ?? ''),
    website: typeof row?.website === 'string' && row.website ? row.website : null,
    joinedAt: typeof row?.joinedAt === 'string' ? row.joinedAt : null,
    allowMessages,
    isBot: bot,
    verified: bot ? BOT_VERIFICATION : toVerification(row),
    stats: { karma, stories, comments, followers, following },
    viewer: viewerState,
  }
}

export async function listUserComments(userId: string, page: number): Promise<UserCommentsPage> {
  const { tables, ids } = db()
  const result = await tables.listRows({
    databaseId: ids.databaseId,
    tableId: ids.comments,
    queries: [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(FEED_PAGE_SIZE + 1),
      Query.offset((page - 1) * FEED_PAGE_SIZE),
      Query.select(['$id', '$createdAt', 'postId', 'content', 'count']),
    ],
    total: false,
  })
  const rows = (result.rows as Array<Row>).slice(0, FEED_PAGE_SIZE)
  const postIds = [...new Set(rows.map((row) => String(row.postId)))]
  const titles = new Map<string, string>()
  if (postIds.length > 0) {
    const posts = await tables
      .listRows({
        databaseId: ids.databaseId,
        tableId: ids.posts,
        queries: [Query.equal('$id', postIds), Query.limit(postIds.length), Query.select(['$id', 'title'])],
        total: false,
      })
      .catch(() => ({ rows: [] as Array<Row> }))
    for (const post of posts.rows as Array<Row>) titles.set(post.$id, String(post.title ?? ''))
  }
  return {
    comments: rows
      .filter((row) => titles.has(String(row.postId)))
      .map((row) => ({
        id: row.$id,
        postId: String(row.postId),
        postTitle: titles.get(String(row.postId)) ?? '',
        content: String(row.content ?? ''),
        count: typeof row.count === 'number' ? row.count : 0,
        createdAt: row.$createdAt,
      })),
    page,
    hasMore: result.rows.length > FEED_PAGE_SIZE,
  }
}

/** Search people by name for the "new message" picker. */
export async function searchPeople(term: string, viewerId: string): Promise<Array<PersonSummary>> {
  const query = term.trim()
  if (query.length < 2) return []
  const { tables, ids } = db()
  const result = await tables
    .listRows({
      databaseId: ids.databaseId,
      tableId: ids.profiles,
      queries: [
        Query.search('name', query),
        Query.equal('allowMessages', 'everyone'),
        Query.notEqual('$id', viewerId),
        Query.limit(10),
        Query.select(['$id', 'name']),
      ],
      total: false,
    })
    .catch((error: unknown) => {
      console.error('[profiles] search failed', error)
      return { rows: [] as Array<Row> }
    })
  return (result.rows as Array<Row>).map((row) => ({ id: row.$id, name: String(row.name ?? '') }))
}

/* ────────────────────────────────── Mutations ────────────────────────────────── */

export interface ProfileInput {
  name: string
  bio: string
  website: string
  allowMessages: MessagePrivacy
}

/** The browser renames the Appwrite account itself; this keeps the public profile in step. */
export async function updateProfile(
  user: SessionUser,
  input: ProfileInput,
): Promise<ActionResult<{ name: string }>> {
  const { tables, ids } = db()
  const name = input.name.trim()
  const data = {
    name,
    bio: input.bio.trim(),
    website: input.website.trim(),
    allowMessages: input.allowMessages,
  }
  const existing = await getProfileRow(user.id)
  if (existing) {
    await tables.updateRow({ databaseId: ids.databaseId, tableId: ids.profiles, rowId: user.id, data })
  } else {
    await tables.createRow({
      databaseId: ids.databaseId,
      tableId: ids.profiles,
      rowId: user.id,
      data: { ...data, joinedAt: new Date().toISOString() },
    })
  }
  markSynced(user.id, name)
  return { ok: true, data: { name } }
}

export async function setBlocked(
  user: SessionUser,
  otherId: string,
  blocked: boolean,
): Promise<ActionResult> {
  if (otherId === user.id) return { ok: false, error: 'You can’t block yourself.' }
  const { tables, ids } = db()
  const existing = await tables.listRows({
    databaseId: ids.databaseId,
    tableId: ids.blocks,
    queries: [Query.equal('userId', user.id), Query.equal('blockedUserId', otherId), Query.limit(5)],
    total: false,
  })
  if (blocked && existing.rows.length === 0) {
    await tables
      .createRow({
        databaseId: ids.databaseId,
        tableId: ids.blocks,
        rowId: ID.unique(),
        data: { userId: user.id, blockedUserId: otherId },
      })
      .catch((error: unknown) => {
        if (!(error instanceof AppwriteException && error.code === 409)) throw error
      })
  }
  if (!blocked) {
    await Promise.all(
      existing.rows.map((row) =>
        tables.deleteRow({ databaseId: ids.databaseId, tableId: ids.blocks, rowId: row.$id }),
      ),
    )
  }
  return { ok: true, data: undefined }
}

/* ─────────────────────────────────── Follows ─────────────────────────────────── */

export async function getFollowedIds(followerId: string): Promise<Array<string>> {
  const { tables, ids } = db()
  const result = await tables
    .listRows({
      databaseId: ids.databaseId,
      tableId: ids.follows,
      queries: [Query.equal('followerId', followerId), Query.limit(500), Query.select(['userId'])],
      total: false,
    })
    .catch(() => ({ rows: [] as Array<Row> }))
  return (result.rows as Array<Row>).map((row) => String(row.userId))
}

/** A page of someone's followers, or of the people they follow, most recent first. */
export async function listFollows(
  userId: string,
  direction: 'followers' | 'following',
  page: number,
): Promise<PeoplePage> {
  const { tables, ids } = db()
  // A follow row reads "followerId follows userId".
  const [match, other] = direction === 'followers' ? ['userId', 'followerId'] : ['followerId', 'userId']
  const result = await tables.listRows({
    databaseId: ids.databaseId,
    tableId: ids.follows,
    queries: [
      Query.equal(match, userId),
      Query.orderDesc('$createdAt'),
      Query.limit(FEED_PAGE_SIZE + 1),
      Query.offset((page - 1) * FEED_PAGE_SIZE),
      Query.select([other]),
    ],
    total: false,
  })
  const personIds = (result.rows as Array<Row>).slice(0, FEED_PAGE_SIZE).map((row) => String(row[other]))
  const [people, bios] = await Promise.all([
    getPeople(personIds),
    personIds.length === 0
      ? Promise.resolve([] as Array<Row>)
      : tables
          .listRows({
            databaseId: ids.databaseId,
            tableId: ids.profiles,
            queries: [
              Query.equal('$id', personIds),
              Query.limit(personIds.length),
              Query.select(['$id', 'bio']),
            ],
            total: false,
          })
          .then((rows) => rows.rows as Array<Row>)
          .catch(() => [] as Array<Row>),
  ])
  const bioById = new Map(bios.map((row) => [row.$id, String(row.bio ?? '')]))
  return {
    people: personIds.map((id) => ({
      id,
      name: people.get(id)?.name ?? 'Refetch user',
      bio: isBotUser(id) ? BOT_PROFILE.bio : (bioById.get(id) ?? ''),
    })),
    page,
    hasMore: result.rows.length > FEED_PAGE_SIZE,
  }
}

export async function setFollowing(
  user: SessionUser,
  userId: string,
  follow: boolean,
): Promise<ActionResult> {
  if (userId === user.id) return { ok: false, error: 'You can’t follow yourself.' }
  const { tables, ids } = db()
  const existing = await tables.listRows({
    databaseId: ids.databaseId,
    tableId: ids.follows,
    queries: [Query.equal('followerId', user.id), Query.equal('userId', userId), Query.limit(5)],
    total: false,
  })
  if (follow && existing.rows.length === 0) {
    const created = await tables
      .createRow({
        databaseId: ids.databaseId,
        tableId: ids.follows,
        rowId: ID.unique(),
        data: { followerId: user.id, userId },
      })
      .then(() => true)
      .catch((error: unknown) => {
        if (!(error instanceof AppwriteException && error.code === 409)) throw error
        return false
      })
    // Once per pair: unfollowing and following again doesn't ping them twice.
    if (created) {
      await notify({
        recipientId: userId,
        type: 'follow',
        actor: { id: user.id, name: user.name || 'Refetch user' },
        dedupeKey: `follow:${user.id}:${userId}`,
      })
    }
  }
  if (!follow) {
    await Promise.all(
      existing.rows.map((row) =>
        tables.deleteRow({ databaseId: ids.databaseId, tableId: ids.follows, rowId: row.$id }),
      ),
    )
  }
  return { ok: true, data: undefined }
}

/** Featured people first, then the most active recent submitters with a profile. */
export async function getOnboardingSuggestions(viewer: SessionUser): Promise<OnboardingSuggestions> {
  const { tables, ids } = db()
  const recent = await tables
    .listRows({
      databaseId: ids.databaseId,
      tableId: ids.posts,
      queries: [
        Query.notEqual('userId', '0'),
        Query.greaterThan('$createdAt', new Date(Date.now() - 60 * 86_400_000).toISOString()),
        Query.orderDesc('$createdAt'),
        Query.limit(500),
        Query.select(['userId']),
      ],
      total: false,
    })
    .catch(() => ({ rows: [] as Array<Row> }))
  const counts = new Map<string, number>()
  for (const row of recent.rows as Array<Row>) {
    const id = String(row.userId)
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const active = [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .filter((id) => !FEATURED_PEOPLE.includes(id))
  const candidates = [...FEATURED_PEOPLE, ...active].filter((id) => id !== viewer.id).slice(0, 8)
  const people = await getPeople(candidates)
  const suggestions: Array<SuggestedPerson> = candidates.map((id) => {
    const featured = FEATURED_PEOPLE.includes(id)
    const stories = counts.get(id) ?? 0
    return {
      id,
      name: people.get(id)?.name ?? 'Refetch user',
      featured,
      reason: featured ? 'Founder of Appwrite' : `${stories} ${stories === 1 ? 'story' : 'stories'} lately`,
    }
  })
  return { channels: ONBOARDING_CHANNELS, people: suggestions.slice(0, 6) }
}

/** "Who to follow": onboarding suggestions minus people already followed (everyone, for visitors). */
export async function getWhoToFollow(viewer: SessionUser | null, limit = 3): Promise<Array<SuggestedPerson>> {
  const [suggestions, followed] = await Promise.all([
    getOnboardingSuggestions(viewer ?? { id: '', name: '', email: '' }),
    viewer ? getFollowedIds(viewer.id) : Promise.resolve([] as Array<string>),
  ])
  const skip = new Set(followed)
  return suggestions.people.filter((person) => !skip.has(person.id)).slice(0, limit)
}

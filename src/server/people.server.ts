import type { ProfileInsights } from '@/lib/types'
import { listChannels, matchChannel } from './channels.server'
import { Query, db, type Row } from './db.server'
import { getFollowedIds, getPeople } from './profiles.server'

const MONTHS = 12

/** Index of the UTC month containing `iso`, counted from year 0 (comparable across years). */
function monthIndex(iso: string | number) {
  const date = new Date(iso)
  return date.getUTCFullYear() * 12 + date.getUTCMonth()
}

/** What a profile's sidebar shows: where they post, their best stories, recent activity, who they follow. */
export async function getProfileInsights(userId: string): Promise<ProfileInsights> {
  const { tables, ids } = db()
  const current = monthIndex(Date.now())
  const first = current - (MONTHS - 1)
  const since = new Date(Date.UTC(Math.floor(first / 12), first % 12, 1)).toISOString()
  const [posts, comments, followedIds, channels] = await Promise.all([
    tables
      .listRows({
        databaseId: ids.databaseId,
        tableId: ids.posts,
        queries: [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(500),
          Query.select(['$id', '$createdAt', 'title', 'count', 'countComments', 'channel', 'topics']),
        ],
        total: false,
      })
      .then((result) => result.rows as Array<Row>)
      .catch(() => [] as Array<Row>),
    tables
      .listRows({
        databaseId: ids.databaseId,
        tableId: ids.comments,
        queries: [
          Query.equal('userId', userId),
          Query.greaterThan('$createdAt', since),
          Query.limit(1000),
          Query.select(['$createdAt']),
        ],
        total: false,
      })
      .then((result) => result.rows as Array<Row>)
      .catch(() => [] as Array<Row>),
    getFollowedIds(userId),
    listChannels(),
  ])

  // Where they post: explicit channel tags first, then topic matches.
  const known = new Set(channels.map((channel) => channel.id))
  const byChannel = new Map<string, number>()
  for (const post of posts) {
    const id =
      typeof post.channel === 'string' && known.has(post.channel)
        ? post.channel
        : matchChannel(post.topics, channels)
    if (id) byChannel.set(id, (byChannel.get(id) ?? 0) + 1)
  }

  const activity = Array.from({ length: MONTHS }, (_, i) => {
    const index = first + i
    return {
      month: new Date(Date.UTC(Math.floor(index / 12), index % 12, 1)).toISOString().slice(0, 7),
      stories: 0,
      comments: 0,
    }
  })
  for (const post of posts) {
    const i = monthIndex(post.$createdAt) - first
    if (i >= 0 && i < MONTHS) activity[i].stories++
  }
  for (const comment of comments) {
    const i = monthIndex(comment.$createdAt) - first
    if (i >= 0 && i < MONTHS) activity[i].comments++
  }

  const shown = followedIds.slice(0, 8)
  const people = await getPeople(shown)

  return {
    channels: [...byChannel]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, stories]) => ({ id, stories })),
    topStories: [...posts]
      .sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0))
      .slice(0, 3)
      .filter((post) => (Number(post.count) || 0) > 0 || posts.length <= 3)
      .map((post) => ({
        id: post.$id,
        title: String(post.title ?? ''),
        count: Number(post.count) || 0,
        countComments: Number(post.countComments) || 0,
      })),
    activity,
    following: shown.map((id) => people.get(id) ?? { id, name: 'Refetch user' }),
    followingTotal: followedIds.length,
  }
}

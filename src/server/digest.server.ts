import { ID } from 'node-appwrite'
import {
  type DigestFrequency,
  digestWindowMs,
  maxLatenessMs,
  nextDigestAt,
  resolveDigest,
} from '@/lib/digest'
import { type DigestEmail, type DigestStory, digestSubject, renderDigestEmail } from '@/lib/email'
import type { Post } from '@/lib/types'
import { createAdminClient } from './appwrite.server'
import { channelFilter, getJoinedChannelIds, listChannels, withChannels } from './channels.server'
import { POST_LIST_FIELDS, Query, db, listPostRows, toPost, type Row } from './db.server'
import { settingsUrl, toEmailSettings, unsubscribeUrl } from './email-settings.server'
import { getSiteUrl } from './env.server'
import { withoutMuted } from './mutes.server'
import { getFollowedIds } from './profiles.server'

/*
 * Digests go out from `POST /api/digest`, which an hourly Appwrite Function
 * (functions/digest) calls. Each profile carries `digestNextAt`; every run
 * sends the ones that are due and moves them to their next 8 AM, so a retry
 * or an overlapping run never sends twice. Accounts without a time yet are
 * only scheduled on their first run, so turning digests on never mails
 * everyone at once.
 */

const QUALITY = { maxSpamScore: 70, minRelevancyScore: 30 }
const BATCH = 25
/** Stories in each section. */
const SIZES = {
  daily: { forYou: 3, top: 7 },
  weekly: { forYou: 5, top: 10 },
} as const
/** Candidates fetched per section before mutes and de-duplication. */
const POOL = 40

type Frequency = Exclude<DigestFrequency, 'off'>

interface Candidates {
  rows: Array<Row>
  posts: Array<Post>
  tldrs: Map<string, string>
}

/** On-topic stories in the window, best first, with summaries. */
async function candidates(filters: Array<string>, frequency: Frequency, now: number): Promise<Candidates> {
  const since = new Date(now - digestWindowMs(frequency)).toISOString()
  const rows = await listPostRows([
    ...filters,
    Query.greaterThan('$createdAt', since),
    Query.lessThan('spamScore', QUALITY.maxSpamScore),
    Query.greaterThan('relevancyScore', QUALITY.minRelevancyScore),
    Query.equal('enhanced', true),
    // A day is ranked like the front page; a week by what people upvoted.
    ...(frequency === 'daily'
      ? [Query.orderDesc('score'), Query.orderDesc('count')]
      : [Query.orderDesc('count'), Query.orderDesc('score')]),
    Query.limit(POOL),
    Query.select([...POST_LIST_FIELDS, 'tldr']),
  ])
  const posts = await withChannels(
    rows,
    rows.map((row) => toPost(row)),
  )
  const tldrs = new Map(rows.map((row) => [row.$id, typeof row.tldr === 'string' ? row.tldr.trim() : '']))
  return { rows, posts, tldrs }
}

function toStory(post: Post, tldrs: Map<string, string>, site: string): DigestStory {
  return {
    title: post.title,
    threadUrl: `${site}/threads/${post.id}`,
    articleUrl: post.link,
    domain: post.domain,
    summary: tldrs.get(post.id) || post.description,
    points: post.count,
    comments: post.countComments,
  }
}

/** The front page's candidates are the same for everyone in a run; fetch them once. */
function createTopCache(now: number) {
  const cache = new Map<Frequency, Promise<Candidates>>()
  return (frequency: Frequency) => {
    if (!cache.has(frequency)) cache.set(frequency, candidates([], frequency, now))
    return cache.get(frequency)!
  }
}

/** A person's digest content, or null when there's nothing worth sending. */
export async function buildDigest(
  userId: string,
  frequency: Frequency,
  now = Date.now(),
  top: (frequency: Frequency) => Promise<Candidates> = createTopCache(now),
): Promise<Omit<DigestEmail, 'dateLabel'> | null> {
  const site = getSiteUrl()
  const [joinedIds, channels, followed] = await Promise.all([
    getJoinedChannelIds(userId),
    listChannels(),
    getFollowedIds(userId),
  ])
  const joined = channels.filter((channel) => joinedIds.includes(channel.id))
  const sources = [
    ...(joined.length > 0 ? [channelFilter(joined)] : []),
    ...(followed.length > 0 ? [Query.equal('userId', followed.slice(0, 100))] : []),
  ]
  const [general, personal] = await Promise.all([
    top(frequency),
    sources.length > 0
      ? candidates([sources.length === 1 ? sources[0] : Query.or(sources)], frequency, now)
      : Promise.resolve(null),
  ])

  const sizes = SIZES[frequency]
  const forYou = personal
    ? (await withoutMuted(userId, personal.rows, personal.posts)).posts.slice(0, sizes.forYou)
    : []
  const picked = new Set(forYou.map((post) => post.id))
  const topPosts = (await withoutMuted(userId, general.rows, general.posts)).posts
    .filter((post) => !picked.has(post.id))
    .slice(0, sizes.top)
  if (forYou.length + topPosts.length === 0) return null

  return {
    frequency,
    forYou: forYou.map((post) => toStory(post, personal!.tldrs, site)),
    top: topPosts.map((post) => toStory(post, general.tldrs, site)),
    siteUrl: site,
    settingsUrl: settingsUrl(),
    unsubscribeUrl: unsubscribeUrl(userId, 'digest'),
    switchUrl: `${unsubscribeUrl(userId, 'digest')}&switch=${frequency === 'daily' ? 'weekly' : 'daily'}`,
  }
}

/** "Monday, November 2" in the reader's time zone. */
function dateLabel(now: number, timeZone: string | null) {
  try {
    return new Date(now).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: timeZone ?? 'UTC',
    })
  } catch {
    return new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }
}

/** The full email for a person (also used for the preview in Settings). */
export async function renderDigestFor(
  userId: string,
  frequency: Frequency,
  timeZone: string | null,
  now = Date.now(),
  top?: (frequency: Frequency) => Promise<Candidates>,
): Promise<{ subject: string; html: string } | null> {
  const digest = await buildDigest(userId, frequency, now, top)
  if (!digest) return null
  const email = { ...digest, dateLabel: dateLabel(now, timeZone) }
  return { subject: digestSubject(email), html: renderDigestEmail(email) }
}

export interface DigestRun {
  /** Digests sent. */
  sent: number
  /** Accounts given their first send time. */
  scheduled: number
  /** Due, but nothing to send (or too late to be useful). */
  skipped: number
  failed: number
  /** Due accounts left when the time budget ran out; call again. */
  more: boolean
}

/** Send every digest that's due, within `budgetMs`. */
export async function runDigests({ budgetMs = 25_000 } = {}): Promise<DigestRun> {
  const started = Date.now()
  const run: DigestRun = { sent: 0, scheduled: 0, skipped: 0, failed: 0, more: false }
  const { tables, ids } = db()
  const messaging = createAdminClient().messaging
  const top = createTopCache(started)
  const seen = new Set<string>()

  while (true) {
    if (Date.now() - started > budgetMs) {
      run.more = true
      break
    }
    const now = Date.now()
    const due = (
      await tables.listRows({
        databaseId: ids.databaseId,
        tableId: ids.profiles,
        queries: [
          Query.or([Query.isNull('digest'), Query.equal('digest', ['daily', 'weekly'])]),
          Query.or([
            Query.isNull('digestNextAt'),
            Query.lessThanEqual('digestNextAt', new Date(now).toISOString()),
          ]),
          Query.limit(BATCH),
          Query.select(['$id', 'digest', 'digestNextAt', 'timezone', 'emailNotifications']),
        ],
        total: false,
      })
    ).rows as Array<Row>
    // Every row handled below moves out of this query; one that doesn't would loop forever.
    const fresh = due.filter((row) => !seen.has(row.$id))
    if (fresh.length === 0) break

    for (const row of fresh) {
      seen.add(row.$id)
      const settings = toEmailSettings(row)
      const frequency = resolveDigest(row.digest, row.emailNotifications)
      const update = (data: Record<string, unknown>) =>
        tables.updateRow({ databaseId: ids.databaseId, tableId: ids.profiles, rowId: row.$id, data })

      try {
        if (frequency === 'off') {
          await update({ digest: 'off', digestNextAt: null })
          continue
        }
        const next = nextDigestAt(frequency, settings.timezone, now)?.toISOString() ?? null
        const dueAt = typeof row.digestNextAt === 'string' ? new Date(row.digestNextAt).getTime() : null
        if (dueAt === null) {
          await update({ digest: frequency, digestNextAt: next })
          run.scheduled++
          continue
        }
        // Move on first, so a crash mid-send can't send twice.
        await update({ digest: frequency, digestNextAt: next })
        if (now - dueAt > maxLatenessMs(frequency)) {
          run.skipped++
          continue
        }
        const email = await renderDigestFor(row.$id, frequency, settings.timezone, now, top)
        if (!email) {
          run.skipped++
          continue
        }
        await messaging.createEmail({
          messageId: ID.unique(),
          subject: email.subject,
          content: email.html,
          users: [row.$id],
          html: true,
        })
        run.sent++
      } catch (error) {
        run.failed++
        console.error('[digest] failed for', row.$id, error instanceof Error ? error.message : error)
      }
    }
  }
  return run
}

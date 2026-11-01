import { AppwriteException, ID } from 'node-appwrite'
import type { ActionResult, Post, SessionUser } from '@/lib/types'
import { MAX_MUTES, type Mute, type MuteKind, isMuteKind, mutedBy, normalizeMute } from '@/lib/mutes'
import { isNotFound } from './appwrite.server'
import { Query, db, type Row } from './db.server'

/*
 * Mutes are rows in the `mutes` table (userId, kind, value). Feeds read them
 * on every request, so each person's list is cached briefly in memory and
 * dropped when they change it.
 */

const CACHE_MS = 60_000
const CACHE_MAX = 2_000
const cache = new Map<string, { mutes: Array<Mute>; expires: number }>()

export async function listMutes(userId: string): Promise<Array<Mute>> {
  const hit = cache.get(userId)
  if (hit && hit.expires > Date.now()) return hit.mutes
  const { tables, ids } = db()
  const mutes = await tables
    .listRows({
      databaseId: ids.databaseId,
      tableId: ids.mutes,
      queries: [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(MAX_MUTES),
        Query.select(['kind', 'value']),
      ],
      total: false,
    })
    .then((result) =>
      (result.rows as Array<Row>).flatMap((row): Array<Mute> =>
        isMuteKind(row.kind) && typeof row.value === 'string' ? [{ kind: row.kind, value: row.value }] : [],
      ),
    )
    .catch((error: unknown) => {
      // The table is created by `appwrite:setup`; until then nobody has muted anything.
      if (!isNotFound(error)) console.error('[mutes] failed to load', error)
      return [] as Array<Mute>
    })
  cache.delete(userId)
  cache.set(userId, { mutes, expires: Date.now() + CACHE_MS })
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!)
  return mutes
}

export async function setMuted(
  user: SessionUser,
  kind: MuteKind,
  raw: string,
  muted: boolean,
): Promise<ActionResult<Mute>> {
  const value = normalizeMute(kind, raw)
  if (!value) {
    return {
      ok: false,
      error: kind === 'domain' ? 'Enter a site like example.com.' : 'Enter at least two characters.',
    }
  }
  const { tables, ids } = db()
  cache.delete(user.id)
  try {
    if (muted) {
      const count = await tables
        .listRows({
          databaseId: ids.databaseId,
          tableId: ids.mutes,
          queries: [Query.equal('userId', user.id), Query.limit(1)],
          total: true,
        })
        .then((result) => result.total)
      if (count >= MAX_MUTES) {
        return { ok: false, error: `You can mute up to ${MAX_MUTES} things. Unmute a few first.` }
      }
      await tables
        .createRow({
          databaseId: ids.databaseId,
          tableId: ids.mutes,
          rowId: ID.unique(),
          data: { userId: user.id, kind, value },
        })
        .catch((error: unknown) => {
          // 409: already muted (unique index).
          if (!(error instanceof AppwriteException && error.code === 409)) throw error
        })
    } else {
      const existing = await tables.listRows({
        databaseId: ids.databaseId,
        tableId: ids.mutes,
        queries: [
          Query.equal('userId', user.id),
          Query.equal('kind', kind),
          Query.equal('value', value),
          Query.limit(5),
        ],
        total: false,
      })
      await Promise.all(
        existing.rows.map((row) =>
          tables.deleteRow({ databaseId: ids.databaseId, tableId: ids.mutes, rowId: row.$id }),
        ),
      )
    }
  } catch (error) {
    if (isNotFound(error)) return { ok: false, error: 'Muting isn’t set up yet. Please try again later.' }
    throw error
  } finally {
    cache.delete(user.id)
  }
  return { ok: true, data: { kind, value } }
}

/** Drop the stories a person muted. `rows` line up with `posts` and carry their topics. */
export async function withoutMuted(
  userId: string | undefined,
  rows: Array<Row>,
  posts: Array<Post>,
): Promise<{ rows: Array<Row>; posts: Array<Post> }> {
  if (!userId) return { rows, posts }
  const mutes = await listMutes(userId)
  if (mutes.length === 0) return { rows, posts }
  const keep = posts.map(
    (post, i) => !mutedBy({ ...post, topics: Array.isArray(rows[i]?.topics) ? rows[i].topics : [] }, mutes),
  )
  return { rows: rows.filter((_, i) => keep[i]), posts: posts.filter((_, i) => keep[i]) }
}

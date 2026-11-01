import * as React from 'react'
import type { Comment } from './types'

/*
 * When you last opened each thread, and how many comments it had then. Kept in
 * this browser only (localStorage): threads mark the comments posted since, and
 * feed rows show how many arrived. Storage can be missing or blocked (private
 * windows, previews), so every access is guarded and the app works without it.
 */

const STORAGE_KEY = 'refetch:visits'
/** Threads remembered; the least recently opened go first. */
const MAX_VISITS = 500

export interface Visit {
  /** When the thread was last open (ms since epoch). */
  at: number
  /** Comments it had then. */
  count: number
}

type VisitMap = Record<string, [at: number, count: number]>

let cache: VisitMap | null = null
const listeners = new Set<() => void>()

function load(): VisitMap {
  if (cache) return cache
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
    cache = parsed && typeof parsed === 'object' ? (parsed as VisitMap) : {}
  } catch {
    cache = {}
  }
  return cache
}

function save(map: VisitMap) {
  cache = map
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Full or blocked storage: keep this tab's copy.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Another tab opened a thread.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return
    cache = null
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function readVisit(postId: string): Visit | null {
  if (typeof window === 'undefined') return null
  const entry = load()[postId]
  return Array.isArray(entry) && typeof entry[0] === 'number' && typeof entry[1] === 'number'
    ? { at: entry[0], count: entry[1] }
    : null
}

export function recordVisit(postId: string, count: number, at = Date.now()) {
  if (typeof window === 'undefined') return
  const map = { ...load() }
  delete map[postId]
  map[postId] = [at, count]
  save(pruneVisits(map, MAX_VISITS))
}

/** Keep the `max` most recently opened threads. */
export function pruneVisits(map: VisitMap, max: number): VisitMap {
  const entries = Object.entries(map)
  if (entries.length <= max) return map
  entries.sort((a, b) => b[1][0] - a[1][0])
  return Object.fromEntries(entries.slice(0, max))
}

/** The last visit to a thread; null on the server and on first render, so hydration matches. */
export function useVisit(postId: string): Visit | null {
  const getSnapshot = React.useCallback(() => {
    const entry = typeof window === 'undefined' ? undefined : load()[postId]
    return entry ? `${entry[0]}:${entry[1]}` : ''
  }, [postId])
  const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, () => '')
  return React.useMemo(() => {
    if (!snapshot) return null
    const [at, count] = snapshot.split(':').map(Number)
    return { at, count }
  }, [snapshot])
}

/**
 * Comments posted since `since` by other people, as a set of IDs. Your own
 * comments never count as new.
 */
export function newCommentIds(
  comments: ReadonlyArray<Pick<Comment, 'id' | 'createdAt' | 'userId'>>,
  since: number | null,
  viewerId: string | null,
): Set<string> {
  const ids = new Set<string>()
  if (since === null) return ids
  for (const comment of comments) {
    if (comment.userId === viewerId) continue
    if (new Date(comment.createdAt).getTime() > since) ids.add(comment.id)
  }
  return ids
}

/** How many comments a story gained since the visit (0 when never opened). */
export function newCommentCount(visit: Visit | null, countComments: number): number {
  return visit ? Math.max(0, countComments - visit.count) : 0
}

import * as React from 'react'
import type { ResourceType, Vote, VoteDirection, VoteState } from './types'

/**
 * Client-side vote cache. Votes made in this tab win over (possibly older)
 * server data for a short while, so the same story shows the same state on
 * the feed and on its thread page.
 */
const OVERRIDE_TTL = 5 * 60_000
const overrides = new Map<string, VoteState & { at: number }>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit() {
  for (const listener of listeners) listener()
}

export function setVoteOverride(type: ResourceType, id: string, state: VoteState) {
  overrides.set(`${type}:${id}`, { ...state, at: Date.now() })
  emit()
}

export function clearVoteOverrides() {
  overrides.clear()
  emit()
}

/** Pure toggle logic (same rules as the server). */
export function nextVoteState(current: VoteState, direction: VoteDirection): VoteState {
  const delta = (vote: Vote) => (vote === 'up' ? 1 : vote === 'down' ? -1 : 0)
  const vote: Vote = current.vote === direction ? null : direction
  return { vote, count: current.count - delta(current.vote) + delta(vote) }
}

export function useVoteState(type: ResourceType, id: string, server: VoteState): VoteState {
  const key = `${type}:${id}`
  const serverState = React.useMemo<VoteState>(
    () => ({ vote: server.vote, count: server.count }),
    [server.vote, server.count],
  )

  const getSnapshot = React.useCallback(() => {
    const override = overrides.get(key)
    return override && Date.now() - override.at < OVERRIDE_TTL ? override : serverState
  }, [key, serverState])

  return React.useSyncExternalStore(subscribe, getSnapshot, () => serverState)
}

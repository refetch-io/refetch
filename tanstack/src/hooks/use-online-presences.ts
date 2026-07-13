import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { presences } from '@/lib/appwrite-web'
import {
  PRESENCE_REMOVED_EVENT,
  PRESENCE_UPDATED_EVENT,
  formatPresenceStatus,
  mapPresence,
  presenceStatusTone,
  type OnlinePresence,
  type PresenceRemovedDetail,
} from '@/lib/presence'

const PRESENCE_POLL_MS = 15_000

function sortPresences(items: OnlinePresence[]) {
  return [...items].sort((a, b) => {
    const toneRank = (status: string) => {
      const tone = presenceStatusTone(status)
      if (tone === 'online') return 0
      if (tone === 'busy') return 1
      return 2
    }
    const byTone = toneRank(a.status) - toneRank(b.status)
    if (byTone !== 0) return byTone
    return a.name.localeCompare(b.name)
  })
}

function fromMap(map: Map<string, OnlinePresence>) {
  return sortPresences(Array.from(map.values()))
}

export function useOnlinePresences() {
  const { isAuthenticated } = useAuth()
  const [byUserId, setByUserId] = useState<Map<string, OnlinePresence>>(
    () => new Map(),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const applyPresence = (presence: OnlinePresence) => {
      if (!presence.userId) return
      setByUserId((prev) => {
        const next = new Map(prev)
        next.set(presence.userId, presence)
        return next
      })
    }

    const load = async (opts?: { quiet?: boolean }) => {
      if (!isAuthenticated) {
        if (!cancelled) {
          setByUserId(new Map())
          setError(false)
          setLoading(false)
        }
        return
      }

      if (!opts?.quiet) setLoading(true)

      try {
        const result = await presences.list({ total: false })
        if (cancelled) return
        const next = new Map<string, OnlinePresence>()
        for (const presence of result.presences ?? []) {
          const mapped = mapPresence(presence)
          if (!mapped.userId) continue
          next.set(mapped.userId, mapped)
        }
        setByUserId(next)
        setError(false)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const onLocalPresence = (event: Event) => {
      const detail = (event as CustomEvent<OnlinePresence>).detail
      if (detail) applyPresence(detail)
    }

    const onPresenceRemoved = (event: Event) => {
      const userId = (event as CustomEvent<PresenceRemovedDetail>).detail
        ?.userId
      if (!userId) return
      setByUserId((prev) => {
        if (!prev.has(userId)) return prev
        const next = new Map(prev)
        next.delete(userId)
        return next
      })
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void load({ quiet: true })
      }
    }

    void load()
    window.addEventListener(PRESENCE_UPDATED_EVENT, onLocalPresence)
    window.addEventListener(PRESENCE_REMOVED_EVENT, onPresenceRemoved)
    document.addEventListener('visibilitychange', onVisibility)

    const pollId = window.setInterval(() => {
      void load({ quiet: true })
    }, PRESENCE_POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(pollId)
      window.removeEventListener(PRESENCE_UPDATED_EVENT, onLocalPresence)
      window.removeEventListener(PRESENCE_REMOVED_EVENT, onPresenceRemoved)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isAuthenticated])

  const users = useMemo(() => fromMap(byUserId), [byUserId])

  return {
    users,
    count: users.length,
    loading,
    error,
    statusLabel: formatPresenceStatus,
    statusTone: presenceStatusTone,
  }
}

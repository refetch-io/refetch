import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type { Models } from 'appwrite'
import { useAuth } from '@/contexts/auth-context'
import { Channel, presences, realtime } from '@/lib/appwrite-web'
import {
  PRESENCE_REMOVED_EVENT,
  PRESENCE_UPDATED_EVENT,
  formatPresenceStatus,
  mapPresence,
  presenceStatusTone,
  type OnlinePresence,
  type PresenceRemovedDetail,
} from '@/lib/presence'

const PRESENCE_CACHE_KEY = 'refetch:online-presences'
const PRESENCE_CACHE_TTL_MS = 60_000

type PresenceSnapshot = {
  users: OnlinePresence[]
  fetchedAt: number
}

type OnlinePresenceContextValue = {
  users: OnlinePresence[]
  count: number
  loading: boolean
  error: boolean
  statusLabel: typeof formatPresenceStatus
  statusTone: typeof presenceStatusTone
}

const OnlinePresenceContext = createContext<OnlinePresenceContextValue | null>(
  null,
)

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

function readCachedPresences(): Map<string, OnlinePresence> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(PRESENCE_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PresenceSnapshot
    if (
      !parsed?.fetchedAt ||
      Date.now() - parsed.fetchedAt > PRESENCE_CACHE_TTL_MS ||
      !Array.isArray(parsed.users)
    ) {
      return null
    }
    const next = new Map<string, OnlinePresence>()
    for (const presence of parsed.users) {
      if (!presence?.userId) continue
      next.set(presence.userId, presence)
    }
    return next
  } catch {
    return null
  }
}

function writeCachedPresences(map: Map<string, OnlinePresence>) {
  if (typeof window === 'undefined') return
  try {
    const snapshot: PresenceSnapshot = {
      users: fromMap(map),
      fetchedAt: Date.now(),
    }
    window.sessionStorage.setItem(PRESENCE_CACHE_KEY, JSON.stringify(snapshot))
  } catch {
    // ignore quota / private mode
  }
}

function clearCachedPresences() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(PRESENCE_CACHE_KEY)
  } catch {
    // ignore
  }
}

function removePresenceUser(
  userId: string,
  setByUserId: Dispatch<SetStateAction<Map<string, OnlinePresence>>>,
) {
  if (!userId) return
  setByUserId((prev) => {
    if (!prev.has(userId)) return prev
    const next = new Map(prev)
    next.delete(userId)
    writeCachedPresences(next)
    return next
  })
}

function isPresenceDeleteEvent(events: string[]) {
  return events.some(
    (event) =>
      event === 'presences.*.delete' ||
      event.endsWith('.delete') ||
      event.includes('.delete'),
  )
}

export function OnlinePresenceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [byUserId, setByUserId] = useState<Map<string, OnlinePresence>>(
    () => new Map(),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const hasLoadedRef = useRef(false)

  const applyPresence = useCallback((presence: OnlinePresence) => {
    if (!presence.userId) return
    setByUserId((prev) => {
      const next = new Map(prev)
      next.set(presence.userId, presence)
      writeCachedPresences(next)
      return next
    })
  }, [])

  // Restore last snapshot before paint so the sidebar doesn’t jump empty → filled.
  useLayoutEffect(() => {
    const cached = readCachedPresences()
    if (!cached) return
    setByUserId(cached)
    setLoading(false)
    hasLoadedRef.current = true
  }, [])

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    const load = async (opts?: { quiet?: boolean }) => {
      if (authLoading) return

      if (!isAuthenticated) {
        if (!cancelled) {
          setByUserId(new Map())
          clearCachedPresences()
          setError(false)
          setLoading(false)
          hasLoadedRef.current = true
        }
        return
      }

      const showLoading = !opts?.quiet && !hasLoadedRef.current
      if (showLoading) setLoading(true)

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
        writeCachedPresences(next)
        setError(false)
        hasLoadedRef.current = true
      } catch {
        if (!cancelled) {
          setError(true)
          if (!hasLoadedRef.current) hasLoadedRef.current = true
        }
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
      if (userId) removePresenceUser(userId, setByUserId)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void load({ quiet: true })
      }
    }

    const startRealtime = async () => {
      try {
        const subscription = await realtime.subscribe(
          Channel.presences(),
          (response) => {
            const payload = response.payload as Models.Presence | undefined
            if (!payload) return

            if (isPresenceDeleteEvent(response.events)) {
              removePresenceUser(
                payload.userId || payload.$id,
                setByUserId,
              )
              return
            }

            const mapped = mapPresence(payload)
            if (mapped.userId) applyPresence(mapped)
          },
        )

        if (cancelled) {
          void subscription.unsubscribe()
          return
        }

        unsubscribe = () => {
          void subscription.unsubscribe()
        }
      } catch {
        // Realtime is best-effort; snapshot + visibility refresh still work.
        if (!cancelled) setError(true)
      }
    }

    void (async () => {
      await load({ quiet: hasLoadedRef.current })
      if (!cancelled && isAuthenticated) {
        await startRealtime()
      }
    })()

    window.addEventListener(PRESENCE_UPDATED_EVENT, onLocalPresence)
    window.addEventListener(PRESENCE_REMOVED_EVENT, onPresenceRemoved)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      unsubscribe?.()
      window.removeEventListener(PRESENCE_UPDATED_EVENT, onLocalPresence)
      window.removeEventListener(PRESENCE_REMOVED_EVENT, onPresenceRemoved)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [applyPresence, authLoading, isAuthenticated])

  const users = useMemo(() => fromMap(byUserId), [byUserId])

  const value = useMemo<OnlinePresenceContextValue>(
    () => ({
      users,
      count: users.length,
      // Keep showing cached users while auth resolves or a quiet refresh runs.
      loading: loading && users.length === 0,
      error,
      statusLabel: formatPresenceStatus,
      statusTone: presenceStatusTone,
    }),
    [error, loading, users],
  )

  return (
    <OnlinePresenceContext.Provider value={value}>
      {children}
    </OnlinePresenceContext.Provider>
  )
}

export function useOnlinePresenceContext() {
  const context = useContext(OnlinePresenceContext)
  if (!context) {
    throw new Error(
      'useOnlinePresenceContext must be used within OnlinePresenceProvider',
    )
  }
  return context
}

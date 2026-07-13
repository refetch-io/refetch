import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
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

  // Restore last snapshot across hard reloads before the first network round-trip.
  useEffect(() => {
    const cached = readCachedPresences()
    if (!cached) return
    setByUserId(cached)
    setLoading(false)
    hasLoadedRef.current = true
  }, [])

  useEffect(() => {
    let cancelled = false

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
      if (!userId) return
      setByUserId((prev) => {
        if (!prev.has(userId)) return prev
        const next = new Map(prev)
        next.delete(userId)
        writeCachedPresences(next)
        return next
      })
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void load({ quiet: true })
      }
    }

    void load({ quiet: hasLoadedRef.current })
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

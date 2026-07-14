import { useEffect, useRef, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { useAuth } from '@/contexts/auth-context'
import { Permission, Role, presences } from '@/lib/appwrite-web'
import {
  PRESENCE_ACTIVITY_EVENT,
  PRESENCE_ACTIVITY_TTL_MS,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_HIDDEN_AWAY_MS,
  PRESENCE_SHARING_CHANGED_EVENT,
  PRESENCE_UPDATED_EVENT,
  clearOwnPresence,
  getPresenceSharingEnabled,
  mapPresence,
  presenceDisplayName,
  presenceExpiresAt,
  resolvePresenceActivity,
  resetPresenceSharingSession,
  seedPresenceSharingFromPrefs,
  type PresenceActivityDetail,
  type PresenceSharingDetail,
} from '@/lib/presence'

function presencePermissions(userId: string) {
  return [
    Permission.read(Role.users()),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]
}

/**
 * Publishes the signed-in user's Appwrite presence while they are in the app.
 * Opt-out (Invisible) is gated centrally via getPresenceSharingEnabled - publishers
 * stop immediately when that flips, without waiting for prefs refresh.
 */
export function PresenceSync() {
  const { user, isAuthenticated } = useAuth()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const pathnameRef = useRef(pathname)
  const userRef = useRef(user)
  const activityOverrideRef = useRef<string | null>(null)
  const awayRef = useRef(false)
  const publishRef = useRef<() => void>(() => {})
  const [, setSharingEpoch] = useState(0)

  pathnameRef.current = pathname
  userRef.current = user

  const userId = user?.$id ?? null
  const sharing = getPresenceSharingEnabled(user?.prefs)

  useEffect(() => {
    if (!user) {
      resetPresenceSharingSession()
      return
    }
    seedPresenceSharingFromPrefs(user.prefs)
  }, [user])

  useEffect(() => {
    const onSharingChanged = () => {
      setSharingEpoch((value) => value + 1)
    }
    window.addEventListener(PRESENCE_SHARING_CHANGED_EVENT, onSharingChanged)
    return () => {
      window.removeEventListener(
        PRESENCE_SHARING_CHANGED_EVENT,
        onSharingChanged,
      )
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !userId) return

    let cancelled = false
    let activityClearId = 0
    let hiddenAwayId = 0
    const permissions = presencePermissions(userId)

    const clearPresence = async () => {
      await clearOwnPresence(userId)
    }

    if (!getPresenceSharingEnabled(userRef.current?.prefs)) {
      void clearPresence()
      publishRef.current = () => {}
      return () => {
        cancelled = true
      }
    }

    const publish = async () => {
      if (cancelled) return
      if (!getPresenceSharingEnabled(userRef.current?.prefs)) return

      const currentUser = userRef.current
      if (!currentUser || currentUser.$id !== userId) return

      const status = awayRef.current ? 'away' : 'online'
      const currentPath = pathnameRef.current
      const activity =
        activityOverrideRef.current || resolvePresenceActivity(currentPath)

      try {
        const presence = await presences.upsert({
          presenceId: userId,
          status,
          expiresAt: presenceExpiresAt(),
          permissions,
          metadata: {
            name: presenceDisplayName(currentUser),
            page: currentPath,
            activity,
          },
        })
        if (
          cancelled ||
          !getPresenceSharingEnabled(userRef.current?.prefs) ||
          typeof window === 'undefined'
        ) {
          return
        }
        window.dispatchEvent(
          new CustomEvent(PRESENCE_UPDATED_EVENT, {
            detail: mapPresence(presence),
          }),
        )
      } catch {
        // Presence is best-effort; ignore transient failures.
      }
    }

    publishRef.current = () => {
      void publish()
    }

    const setOnline = () => {
      window.clearTimeout(hiddenAwayId)
      const wasAway = awayRef.current
      awayRef.current = false
      if (wasAway) void publish()
    }

    const onActivityEvent = (event: Event) => {
      if (!getPresenceSharingEnabled(userRef.current?.prefs)) return
      const detail = (event as CustomEvent<PresenceActivityDetail>).detail
      const next = detail?.activity?.trim() ?? ''
      setOnline()
      window.clearTimeout(activityClearId)

      if (!next) {
        activityOverrideRef.current = null
        void publish()
        return
      }

      activityOverrideRef.current = next
      activityClearId = window.setTimeout(() => {
        activityOverrideRef.current = null
        void publish()
      }, PRESENCE_ACTIVITY_TTL_MS)
      void publish()
    }

    const onVisibility = () => {
      if (!getPresenceSharingEnabled(userRef.current?.prefs)) return
      if (document.visibilityState === 'visible') {
        setOnline()
        void publish()
        return
      }

      window.clearTimeout(hiddenAwayId)
      hiddenAwayId = window.setTimeout(() => {
        if (document.visibilityState !== 'visible') {
          awayRef.current = true
          void publish()
        }
      }, PRESENCE_HIDDEN_AWAY_MS)
    }

    const onPageHide = (event: PageTransitionEvent) => {
      if (event.persisted) return
      void clearPresence()
    }

    const onSharingChanged = (event: Event) => {
      const enabled = (event as CustomEvent<PresenceSharingDetail>).detail
        ?.enabled
      if (enabled === false) {
        cancelled = true
        activityOverrideRef.current = null
        window.clearInterval(heartbeatId)
        window.clearTimeout(activityClearId)
        window.clearTimeout(hiddenAwayId)
        void clearPresence()
      }
    }

    awayRef.current = false
    void publish()
    if (document.visibilityState !== 'visible') onVisibility()

    let heartbeatId = window.setInterval(() => {
      void publish()
    }, PRESENCE_HEARTBEAT_MS)

    window.addEventListener(PRESENCE_ACTIVITY_EVENT, onActivityEvent)
    window.addEventListener(PRESENCE_SHARING_CHANGED_EVENT, onSharingChanged)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      cancelled = true
      activityOverrideRef.current = null
      window.clearInterval(heartbeatId)
      window.clearTimeout(activityClearId)
      window.clearTimeout(hiddenAwayId)
      window.removeEventListener(PRESENCE_ACTIVITY_EVENT, onActivityEvent)
      window.removeEventListener(
        PRESENCE_SHARING_CHANGED_EVENT,
        onSharingChanged,
      )
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [isAuthenticated, sharing, userId])

  useEffect(() => {
    if (!isAuthenticated || !userId || !sharing) return
    publishRef.current()
  }, [isAuthenticated, pathname, sharing, userId])

  return null
}

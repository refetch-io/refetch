import { useEffect, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { useAuth } from '@/contexts/auth-context'
import { Permission, Role, presences } from '@/lib/appwrite-web'
import {
  PRESENCE_ACTIVITY_EVENT,
  PRESENCE_ACTIVITY_TTL_MS,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_IDLE_MS,
  PRESENCE_UPDATED_EVENT,
  clearOwnPresence,
  isPresenceSharingEnabled,
  mapPresence,
  presenceDisplayName,
  presenceExpiresAt,
  resolvePresenceActivity,
  type PresenceActivityDetail,
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
 * Respects the `sharePresence` user preference (default: true).
 */
export function PresenceSync() {
  const { user, isAuthenticated } = useAuth()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const pathnameRef = useRef(pathname)
  const userRef = useRef(user)
  const activityOverrideRef = useRef<string | null>(null)
  const idleRef = useRef(false)
  const publishRef = useRef<() => void>(() => {})

  pathnameRef.current = pathname
  userRef.current = user

  const userId = user?.$id ?? null
  const sharing = isPresenceSharingEnabled(user?.prefs)

  useEffect(() => {
    if (!isAuthenticated || !userId) return

    let cancelled = false
    let activityClearId = 0
    let idleTimerId = 0
    const permissions = presencePermissions(userId)

    const clearPresence = async () => {
      await clearOwnPresence(userId)
    }

    if (!sharing) {
      void clearPresence()
      return () => {
        cancelled = true
      }
    }

    const publish = async () => {
      if (cancelled) return
      const currentUser = userRef.current
      if (!currentUser || currentUser.$id !== userId) return

      const status = idleRef.current
        ? 'away'
        : typeof document !== 'undefined' &&
            document.visibilityState !== 'visible'
          ? 'away'
          : 'online'

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
        if (!cancelled && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(PRESENCE_UPDATED_EVENT, {
              detail: mapPresence(presence),
            }),
          )
        }
      } catch {
        // Presence is best-effort; ignore transient failures.
      }
    }

    publishRef.current = () => {
      void publish()
    }

    const markActive = () => {
      const wasIdle = idleRef.current
      idleRef.current = false
      window.clearTimeout(idleTimerId)
      idleTimerId = window.setTimeout(() => {
        idleRef.current = true
        void publish()
      }, PRESENCE_IDLE_MS)
      if (wasIdle) void publish()
    }

    const onActivityEvent = (event: Event) => {
      const detail = (event as CustomEvent<PresenceActivityDetail>).detail
      const next = detail?.activity?.trim() ?? ''
      idleRef.current = false
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
      if (document.visibilityState === 'visible') markActive()
      void publish()
    }

    const onPageHide = () => {
      void clearPresence()
    }

    void publish()
    markActive()

    const heartbeatId = window.setInterval(() => {
      void publish()
    }, PRESENCE_HEARTBEAT_MS)

    window.addEventListener(PRESENCE_ACTIVITY_EVENT, onActivityEvent)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pointerdown', markActive)
    window.addEventListener('keydown', markActive)

    return () => {
      cancelled = true
      activityOverrideRef.current = null
      window.clearInterval(heartbeatId)
      window.clearTimeout(activityClearId)
      window.clearTimeout(idleTimerId)
      window.removeEventListener(PRESENCE_ACTIVITY_EVENT, onActivityEvent)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pointerdown', markActive)
      window.removeEventListener('keydown', markActive)
    }
  }, [isAuthenticated, sharing, userId])

  // Republish page/activity when the route changes without resetting the session.
  useEffect(() => {
    if (!isAuthenticated || !userId || !sharing) return
    publishRef.current()
  }, [isAuthenticated, pathname, sharing, userId])

  return null
}

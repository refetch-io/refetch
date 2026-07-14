import type { Models } from 'appwrite'
import { updateAccountPrefs } from '@/lib/account-prefs'
import { account, presences } from '@/lib/appwrite-web'

export const PRESENCE_HEARTBEAT_MS = 45_000
/** Must stay well above heartbeat × throttle delay in background tabs. */
export const PRESENCE_TTL_MS = 5 * 60_000
/**
 * Only mark Away after the tab has been hidden this long.
 * Brief focus blips (devtools, IDE panes) should not flip status.
 */
export const PRESENCE_HIDDEN_AWAY_MS = 60_000
export const PRESENCE_ACTIVITY_TTL_MS = 20_000
export const PRESENCE_UPDATED_EVENT = 'refetch:presence-updated'
export const PRESENCE_REMOVED_EVENT = 'refetch:presence-removed'
export const PRESENCE_ACTIVITY_EVENT = 'refetch:presence-activity'
export const PRESENCE_SHARING_CHANGED_EVENT = 'refetch:presence-sharing-changed'
export const PRESENCE_SHARE_PREF_KEY = 'sharePresence'

export type PresenceMetadata = {
  name?: string
  page?: string
  activity?: string
}

export type OnlinePresence = {
  id: string
  userId: string
  status: string
  name: string
  page?: string
  activity?: string
  updatedAt: string
}

export type PresenceActivityDetail = {
  activity: string
}

export type PresenceRemovedDetail = {
  userId: string
}

export type PresenceSharingDetail = {
  enabled: boolean
}

/** Session override - set immediately on Invisible/Online so publishers stop before prefs refresh. */
let presenceSharingOverride: boolean | null = null

/** Default on when the pref is unset. */
export function isPresenceSharingEnabled(
  prefs?: Record<string, unknown> | null,
): boolean {
  return prefs?.[PRESENCE_SHARE_PREF_KEY] !== false
}

/** Central gate for every presence publish / activity report. */
export function getPresenceSharingEnabled(
  prefs?: Record<string, unknown> | null,
): boolean {
  if (presenceSharingOverride !== null) return presenceSharingOverride
  return isPresenceSharingEnabled(prefs)
}

export function setPresenceSharingEnabled(enabled: boolean) {
  presenceSharingOverride = enabled
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<PresenceSharingDetail>(PRESENCE_SHARING_CHANGED_EVENT, {
      detail: { enabled },
    }),
  )
}

export function seedPresenceSharingFromPrefs(
  prefs?: Record<string, unknown> | null,
) {
  if (presenceSharingOverride !== null) return
  presenceSharingOverride = isPresenceSharingEnabled(prefs)
}

export function resetPresenceSharingSession() {
  presenceSharingOverride = null
}

export function notifyPresenceRemoved(userId: string) {
  if (typeof window === 'undefined' || !userId) return
  window.dispatchEvent(
    new CustomEvent<PresenceRemovedDetail>(PRESENCE_REMOVED_EVENT, {
      detail: { userId },
    }),
  )
}

export async function clearOwnPresence(userId?: string) {
  const id = userId || (await account.get()).$id
  try {
    await presences.delete({ presenceId: id })
  } catch {
    // already gone
  }
  notifyPresenceRemoved(id)
  return id
}

export async function persistPresenceSharing(enabled: boolean) {
  // Stop / resume publishers immediately - don't wait for prefs round-trip.
  setPresenceSharingEnabled(enabled)

  await updateAccountPrefs({ [PRESENCE_SHARE_PREF_KEY]: enabled })

  if (!enabled) {
    await clearOwnPresence()
  }
}

/** Temporary activity override (voting, commenting, searching, …). */
export function reportPresenceActivity(activity: string) {
  if (typeof window === 'undefined') return
  if (!getPresenceSharingEnabled()) return
  window.dispatchEvent(
    new CustomEvent<PresenceActivityDetail>(PRESENCE_ACTIVITY_EVENT, {
      detail: { activity },
    }),
  )
}

/** Return to page-based presence activity immediately. */
export function clearPresenceActivity() {
  reportPresenceActivity('')
}

export function presenceDisplayName(
  user: { name?: string; email?: string } | null | undefined,
): string {
  const name = user?.name?.trim()
  if (name) return name
  const email = user?.email?.trim()
  if (email) return email.split('@')[0] || email
  return 'Refetcher'
}

export function resolvePresenceActivity(pathname: string): string {
  if (pathname.startsWith('/threads/')) return 'Reading a thread'
  if (pathname.startsWith('/submit')) return 'Writing a submission'
  if (pathname.startsWith('/account')) return 'Updating account'
  if (pathname.startsWith('/mines')) return 'Viewing my posts'
  if (pathname.startsWith('/show')) return 'Browsing Show'
  if (pathname.startsWith('/new')) return 'Browsing New'
  if (pathname.startsWith('/signin')) return 'Signing in'
  if (pathname.startsWith('/signup')) return 'Creating an account'
  if (pathname === '/' || pathname.startsWith('/top')) return 'Browsing Top'
  return 'Online'
}

export function formatPresenceStatus(
  status?: string,
  metadata?: PresenceMetadata | null,
): string {
  const normalized = (status || 'online').toLowerCase()
  if (normalized === 'away') return 'Away'
  if (normalized === 'busy') return 'Busy'
  if (normalized === 'typing') return 'Typing…'

  if (metadata?.activity?.trim()) return metadata.activity.trim()
  return resolvePresenceActivity(metadata?.page || '')
}

export function presenceStatusTone(
  status?: string,
): 'online' | 'away' | 'busy' | 'offline' {
  const normalized = (status || 'online').toLowerCase()
  if (normalized === 'offline' || normalized === 'hidden') return 'offline'
  if (normalized === 'away') return 'away'
  if (normalized === 'busy' || normalized === 'typing') return 'busy'
  return 'online'
}

export const PRESENCE_STATUS_DOT: Record<
  'online' | 'away' | 'busy' | 'offline',
  string
> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-400',
  busy: 'bg-sky-500',
  offline: 'bg-zinc-400 dark:bg-zinc-500',
}

/** Local presence indicator for the signed-in user (avatar badge). */
export function ownPresenceTone(params: {
  sharing: boolean
  visible?: boolean
}): 'online' | 'away' | 'offline' {
  if (!params.sharing) return 'offline'
  if (params.visible === false) return 'away'
  return 'online'
}

export function mapPresence(presence: Models.Presence): OnlinePresence {
  const metadata = (presence.metadata ?? {}) as PresenceMetadata
  const userId = presence.userId || presence.$id
  const fallbackId = userId ? userId.slice(0, 6) : '??????'
  return {
    id: presence.$id || userId,
    userId,
    status: presence.status || 'online',
    name: metadata.name?.trim() || `User ${fallbackId}`,
    page: metadata.page,
    activity: metadata.activity,
    updatedAt: presence.$updatedAt,
  }
}

export function presenceExpiresAt(ttlMs = PRESENCE_TTL_MS): string {
  return new Date(Date.now() + ttlMs).toISOString()
}

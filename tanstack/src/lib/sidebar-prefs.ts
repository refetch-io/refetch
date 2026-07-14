import { coercePrefBoolean, updateAccountPrefs } from '@/lib/account-prefs'

export const SIDEBAR_OPEN_PREF_KEY = 'sidebarOpen'
export const SIDEBAR_COOKIE_NAME = 'sidebar_state'

export function parseSidebarOpenCookieValue(
  raw: string | undefined | null,
): boolean | null {
  return coercePrefBoolean(raw)
}

export function readSidebarOpenCookie(): boolean | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${SIDEBAR_COOKIE_NAME}=([^;]*)`),
  )
  if (!match) return null
  return parseSidebarOpenCookieValue(match[1])
}

export function writeSidebarOpenCookie(open: boolean) {
  if (typeof document === 'undefined') return
  document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
}

export function getSidebarOpenFromPrefs(
  prefs?: Record<string, unknown> | null,
): boolean | null {
  return coercePrefBoolean(prefs?.[SIDEBAR_OPEN_PREF_KEY])
}

/** Persist sidebar open state to Appwrite prefs (merge; updatePrefs replaces the whole object). */
export async function persistSidebarOpenPreference(open: boolean) {
  await updateAccountPrefs({ [SIDEBAR_OPEN_PREF_KEY]: open })
}

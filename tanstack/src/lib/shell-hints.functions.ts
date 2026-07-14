import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import {
  AUTH_ACCOUNT_COOKIE,
  AUTH_SIGNED_IN_COOKIE,
  parseAccountPreviewCookieValue,
  parseSignedInCookieValue,
} from '@/lib/auth-cookie'
import {
  SIDEBAR_COOKIE_NAME,
  parseSidebarOpenCookieValue,
} from '@/lib/sidebar-prefs'

/** SSR chrome hints so auth/sidebar UI hydrates without a flash. */
export const getAppShellHints = createServerFn({ method: 'GET' }).handler(
  () => {
    const sidebarRaw = getCookie(SIDEBAR_COOKIE_NAME)
    const signedInRaw = getCookie(AUTH_SIGNED_IN_COOKIE)
    const accountRaw = getCookie(AUTH_ACCOUNT_COOKIE)
    const account = parseAccountPreviewCookieValue(accountRaw)
    const signedIn =
      parseSignedInCookieValue(signedInRaw) ?? Boolean(account)

    return {
      sidebarOpen: parseSidebarOpenCookieValue(sidebarRaw) ?? true,
      signedIn,
      account,
    }
  },
)

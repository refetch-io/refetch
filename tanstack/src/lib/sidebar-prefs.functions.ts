import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import {
  SIDEBAR_COOKIE_NAME,
  parseSidebarOpenCookieValue,
} from '@/lib/sidebar-prefs'

/** SSR-safe cookie read so collapsed state hydrates without a DOM mismatch. */
export const getSidebarOpenFromRequest = createServerFn({ method: 'GET' }).handler(
  () => {
    const raw = getCookie(SIDEBAR_COOKIE_NAME)
    return parseSidebarOpenCookieValue(raw) ?? true
  },
)

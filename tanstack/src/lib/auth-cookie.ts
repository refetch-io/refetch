export const AUTH_SIGNED_IN_COOKIE = 'refetch_signed_in'
export const AUTH_ACCOUNT_COOKIE = 'refetch_account'
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export type AccountPreview = {
  name: string
  email: string
}

export function parseSignedInCookieValue(
  raw: string | undefined | null,
): boolean | null {
  if (raw === '1' || raw === 'true') return true
  if (raw === '0' || raw === 'false') return false
  return null
}

export function readSignedInCookie(): boolean | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${AUTH_SIGNED_IN_COOKIE}=([^;]*)`),
  )
  if (!match) return null
  return parseSignedInCookieValue(match[1])
}

export function parseAccountPreviewCookieValue(
  raw: string | undefined | null,
): AccountPreview | null {
  if (!raw) return null
  try {
    let text = raw
    try {
      text = decodeURIComponent(raw)
    } catch {
      // Cookie may already be decoded by the server runtime.
    }
    const parsed = JSON.parse(text) as {
      n?: unknown
      e?: unknown
    }
    const name = typeof parsed.n === 'string' ? parsed.n.trim() : ''
    const email = typeof parsed.e === 'string' ? parsed.e.trim() : ''
    if (!name && !email) return null
    return {
      name: name || email || 'Account',
      email,
    }
  } catch {
    return null
  }
}

export function readAccountPreviewCookie(): AccountPreview | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${AUTH_ACCOUNT_COOKIE}=([^;]*)`),
  )
  if (!match) return null
  return parseAccountPreviewCookieValue(match[1])
}

function writeCookie(name: string, value: string, maxAge: number) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export function writeSignedInCookie(signedIn: boolean) {
  if (signedIn) {
    writeCookie(AUTH_SIGNED_IN_COOKIE, '1', AUTH_COOKIE_MAX_AGE)
  } else {
    writeCookie(AUTH_SIGNED_IN_COOKIE, '', 0)
    writeCookie(AUTH_ACCOUNT_COOKIE, '', 0)
  }
}

export function writeAccountPreviewCookie(preview: AccountPreview) {
  const payload = encodeURIComponent(
    JSON.stringify({
      n: preview.name.slice(0, 80),
      e: preview.email.slice(0, 120),
    }),
  )
  writeCookie(AUTH_SIGNED_IN_COOKIE, '1', AUTH_COOKIE_MAX_AGE)
  writeCookie(AUTH_ACCOUNT_COOKIE, payload, AUTH_COOKIE_MAX_AGE)
}

/** Strip query strings and fragments: `https://a.com/p?x=1#y` → `https://a.com/p`. */
export function cleanUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`
  } catch {
    return url
  }
}

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/** Display hostname without the `www.` prefix. */
export function hostnameOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/** Outbound links carry `ref=refetch.io` so publishers can see where readers come from. */
export function withRef(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set('ref', 'refetch.io')
    return parsed.toString()
  } catch {
    return url
  }
}

/** Appwrite document IDs: up to 36 chars of a-z, A-Z, 0-9, `.`, `-`, `_`. */
export function isValidId(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(value)
}

/** Only allow same-origin relative paths as post-auth destinations. */
export function safeRedirect(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback
  const path = value.trim()
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return fallback
  if (path.startsWith('/signin') || path.startsWith('/signup') || path.startsWith('/auth/')) return fallback
  return path
}

/** Where a URL under a retired prefix lives now (`/c/x?sort=new` → `/channels/x?sort=new`). */
export function movedPath(href: string, from: string, to: string): string {
  return href === from || href.startsWith(`${from}/`) || href.startsWith(`${from}?`)
    ? `${to}${href.slice(from.length)}`
    : href
}

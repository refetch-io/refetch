/** Only allow same-origin relative paths as post-auth destinations. */
export function safeRedirect(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback
  const path = value.trim()
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return fallback
  if (path.startsWith('/signin') || path.startsWith('/signup') || path.startsWith('/auth/')) return fallback
  return path
}

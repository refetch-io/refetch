import { clsx, type ClassValue } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { twMerge } from 'tailwind-merge'
import { env } from './env'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
  } catch {
    return url
  }
}

export function getDomain(link?: string): string {
  if (!link) return 'refetch.io'
  try {
    return new URL(link).hostname
  } catch {
    return 'refetch.io'
  }
}

/** Up to two initials from a display name or email. */
export function getInitials(name: string, max = 2): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'

  const fromWords = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .replace(/[^a-zA-Z0-9]/gi, '')
    .slice(0, max)
    .toUpperCase()

  if (fromWords) return fromWords

  const fromAlnum = trimmed
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, max)
    .toUpperCase()

  return fromAlnum || '?'
}

export function getTimeAgo(createdAt: string): string {
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return ''

  const diffMs = Date.now() - created.getTime()
  if (diffMs < 45_000) return 'Just now'

  return formatDistanceToNow(created, { addSuffix: true })
}

export function getBaseUrl(): string {
  return env.baseUrl || 'https://refetch.io'
}

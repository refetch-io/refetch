import * as React from 'react'
import { cn } from '@/lib/utils'

const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi
const TOKEN = new RegExp(`(?:${URL_PATTERN.source})|(?:${EMAIL_PATTERN.source})`, 'gi')
const MAX_URL_LENGTH = 2048

function isSafeHttpUrl(value: string) {
  if (value.length > MAX_URL_LENGTH) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** Drop trailing punctuation that is almost never part of the link. */
function trimUrl(value: string) {
  let url = value
  while (
    /[.,;:!?'"]$/.test(url) ||
    (url.endsWith(')') && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0))
  ) {
    url = url.slice(0, -1)
  }
  return url
}

function prettyUrl(url: string) {
  const display = url.replace(/^https?:\/\/(www\.)?/i, '')
  return display.length > 64 ? `${display.slice(0, 61)}…` : display
}

/**
 * Renders user-written text with URLs and emails turned into links.
 * Everything else stays plain text — React escapes it, so no HTML injection.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const nodes: Array<React.ReactNode> = []
  let cursor = 0

  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0
    let value = match[0]
    if (index > cursor) nodes.push(text.slice(cursor, index))

    if (/^https?:\/\//i.test(value)) {
      value = trimUrl(value)
      if (isSafeHttpUrl(value)) {
        nodes.push(
          <a key={index} href={value} target="_blank" rel="noopener noreferrer nofollow ugc" title={value}>
            {prettyUrl(value)}
          </a>,
        )
      } else {
        nodes.push(value)
      }
    } else {
      nodes.push(
        <a key={index} href={`mailto:${value}`}>
          {value}
        </a>,
      )
    }
    cursor = index + value.length
  }
  if (cursor < text.length) nodes.push(text.slice(cursor))

  return <div className={cn('prose-comment break-words whitespace-pre-wrap', className)}>{nodes}</div>
}

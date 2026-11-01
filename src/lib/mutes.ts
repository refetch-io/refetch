import { normalizeDomain } from './feeds'
import { topicKey } from './topics'

/*
 * Mutes hide stories from your feeds (Top, New, Show, Following) and digests:
 * a whole channel, a topic, a site (and its subdomains), or titles containing
 * a word. Pages you open on purpose (a channel, topic or site page) still show
 * everything.
 */

export type MuteKind = 'channel' | 'topic' | 'domain' | 'keyword'

export interface Mute {
  kind: MuteKind
  /** Channel ID, topic key, domain or lowercase keyword. */
  value: string
}

export const MUTE_KINDS: ReadonlyArray<MuteKind> = ['channel', 'topic', 'domain', 'keyword']
/** Most mutes one person can keep. */
export const MAX_MUTES = 200
/** Stored values are at most this long (the unique index has a byte budget). */
const MAX_VALUE = 100

export function isMuteKind(value: unknown): value is MuteKind {
  return typeof value === 'string' && (MUTE_KINDS as ReadonlyArray<string>).includes(value)
}

/** The stored form of what someone typed or clicked, or null when it can't be muted. */
export function normalizeMute(kind: MuteKind, raw: string): string | null {
  const text = raw.trim()
  let value: string | null
  switch (kind) {
    case 'channel':
      value = /^[a-z0-9-]{1,64}$/.test(text) ? text : null
      break
    case 'topic':
      value = topicKey(text.replace(/^#/, '')) || null
      break
    case 'domain': {
      let host = text
      // A pasted link mutes its site.
      if (/^https?:\/\//i.test(host)) {
        try {
          host = new URL(host).hostname
        } catch {
          return null
        }
      }
      value = normalizeDomain(host.replace(/\/.*$/, ''))
      break
    }
    case 'keyword': {
      const keyword = text.toLowerCase().replace(/\s+/g, ' ')
      value = keyword.length >= 2 && keyword.length <= 40 ? keyword : null
      break
    }
  }
  return value && value.length <= MAX_VALUE ? value : null
}

export function sameMute(a: Mute, b: Mute) {
  return a.kind === b.kind && a.value === b.value
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Whole words: `rust` matches "Rust 2.0 ships" but not "Trusted types". Word
 * edges only count where the keyword starts or ends with a letter or digit,
 * so `c++` still matches "C++26".
 */
export function keywordMatches(title: string, keyword: string): boolean {
  if (!keyword) return false
  const wordy = /[\p{L}\p{N}]/u
  const before = wordy.test(keyword[0]) ? '(?<![\\p{L}\\p{N}])' : ''
  const after = wordy.test(keyword.at(-1)!) ? '(?![\\p{L}\\p{N}])' : ''
  return new RegExp(`${before}${escapeRegExp(keyword)}${after}`, 'iu').test(title)
}

export function domainMatches(domain: string | null, muted: string): boolean {
  if (!domain) return false
  const host = domain.toLowerCase()
  return host === muted || host.endsWith(`.${muted}`)
}

export interface Mutable {
  title: string
  channel: string | null
  domain: string | null
  topics?: ReadonlyArray<string>
}

/** The first mute that hides this story, if any. */
export function mutedBy(post: Mutable, mutes: ReadonlyArray<Mute>): Mute | null {
  for (const mute of mutes) {
    switch (mute.kind) {
      case 'channel':
        if (post.channel === mute.value) return mute
        break
      case 'domain':
        if (domainMatches(post.domain, mute.value)) return mute
        break
      case 'topic':
        if (post.topics?.some((topic) => topicKey(topic) === mute.value)) return mute
        break
      case 'keyword':
        if (keywordMatches(post.title, mute.value)) return mute
        break
    }
  }
  return null
}

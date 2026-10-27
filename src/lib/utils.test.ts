import { describe, expect, it } from 'vitest'
import { initials, isBotUser, pluralize, timeAgo } from './utils'

describe('timeAgo', () => {
  const now = Date.parse('2026-10-27T12:00:00Z')
  const ago = (ms: number) => new Date(now - ms).toISOString()

  it('uses short relative times', () => {
    expect(timeAgo(ago(10_000), now)).toBe('Just now')
    expect(timeAgo(ago(5 * 60_000), now)).toBe('5m ago')
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe('3h ago')
    expect(timeAgo(ago(26 * 3_600_000), now)).toBe('Yesterday')
    expect(timeAgo(ago(4 * 86_400_000), now)).toBe('4d ago')
  })

  it('returns an empty string for bad dates', () => {
    expect(timeAgo('nope', now)).toBe('')
  })
})

describe('small helpers', () => {
  it('pluralizes and makes initials', () => {
    expect(pluralize(1, 'story', 'stories')).toBe('1 story')
    expect(pluralize(2, 'comment')).toBe('2 comments')
    expect(initials('Ada Lovelace')).toBe('AL')
    expect(initials('   ')).toBe('?')
  })

  it('treats the Scout account as a bot', () => {
    expect(isBotUser('0')).toBe(true)
    expect(isBotUser('68963467d3b94892ac83')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { keywordMatches, mutedBy, normalizeMute } from './mutes'

describe('normalizeMute', () => {
  it('stores each kind in one form', () => {
    expect(normalizeMute('domain', 'https://www.Medium.com/@x/post')).toBe('medium.com')
    expect(normalizeMute('domain', 'www.example.com/path')).toBe('example.com')
    expect(normalizeMute('domain', 'nope')).toBeNull()
    expect(normalizeMute('topic', '#Machine Learning')).toBe('machine-learning')
    expect(normalizeMute('keyword', '  Crypto  Coins ')).toBe('crypto coins')
    expect(normalizeMute('keyword', 'a')).toBeNull()
    expect(normalizeMute('channel', 'rust')).toBe('rust')
    expect(normalizeMute('channel', 'Rust!')).toBeNull()
  })
})

describe('keywordMatches', () => {
  it('matches whole words only, any case', () => {
    expect(keywordMatches('Rust 2.0 ships', 'rust')).toBe(true)
    expect(keywordMatches('Trusted types land in Chrome', 'rust')).toBe(false)
    expect(keywordMatches('C++26 is here', 'c++')).toBe(true)
    expect(keywordMatches('The crypto winter', 'crypto winter')).toBe(true)
  })
})

describe('mutedBy', () => {
  const post = {
    title: 'Bitcoin hits a new high',
    channel: 'ai',
    domain: 'blog.medium.com',
    topics: ['Crypto'],
  }

  it('matches channels, sites (with subdomains), topics and words', () => {
    expect(mutedBy(post, [{ kind: 'channel', value: 'ai' }])?.kind).toBe('channel')
    expect(mutedBy(post, [{ kind: 'domain', value: 'medium.com' }])?.kind).toBe('domain')
    expect(mutedBy(post, [{ kind: 'topic', value: 'crypto' }])?.kind).toBe('topic')
    expect(mutedBy(post, [{ kind: 'keyword', value: 'bitcoin' }])?.kind).toBe('keyword')
  })

  it('leaves everything else alone', () => {
    expect(
      mutedBy(post, [
        { kind: 'channel', value: 'rust' },
        { kind: 'domain', value: 'dium.com' },
        { kind: 'topic', value: 'ai' },
        { kind: 'keyword', value: 'coin' },
      ]),
    ).toBeNull()
    expect(mutedBy({ ...post, domain: null }, [{ kind: 'domain', value: 'medium.com' }])).toBeNull()
  })
})

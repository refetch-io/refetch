import { describe, expect, it } from 'vitest'
import { type FeedDocument, feedPath, normalizeDomain, parseFeedPath, renderAtom, renderRss } from './feeds'

describe('parseFeedPath', () => {
  it('reads every kind of list', () => {
    expect(parseFeedPath('top.xml')).toEqual({ source: { kind: 'top' }, format: 'rss' })
    expect(parseFeedPath('new.atom')).toEqual({ source: { kind: 'new' }, format: 'atom' })
    expect(parseFeedPath('channels/rust.xml')).toEqual({
      source: { kind: 'channel', id: 'rust' },
      format: 'rss',
    })
    expect(parseFeedPath('topics/machine-learning.atom')?.source).toEqual({
      kind: 'topic',
      key: 'machine-learning',
    })
    expect(parseFeedPath('users/68963467d3b94892ac83.xml')?.source).toEqual({
      kind: 'user',
      id: '68963467d3b94892ac83',
    })
    expect(parseFeedPath('from/www.GitHub.com.xml')?.source).toEqual({ kind: 'domain', domain: 'github.com' })
  })

  it('rejects anything else', () => {
    expect(parseFeedPath('top')).toBeNull()
    expect(parseFeedPath('best.xml')).toBeNull()
    expect(parseFeedPath('channels/Rust!.xml')).toBeNull()
    expect(parseFeedPath('channels/a/b.xml')).toBeNull()
    expect(parseFeedPath('from/localhost.xml')).toBeNull()
  })

  it('round-trips with feedPath', () => {
    for (const path of ['/feeds/show.xml', '/feeds/channels/ai.atom', '/feeds/from/dev.to.xml']) {
      const parsed = parseFeedPath(path.replace('/feeds/', ''))!
      expect(feedPath(parsed.source, parsed.format)).toBe(path)
    }
  })
})

describe('normalizeDomain', () => {
  it('lowercases and drops www', () => {
    expect(normalizeDomain('WWW.Example.COM')).toBe('example.com')
    expect(normalizeDomain('blog.example.co.uk')).toBe('blog.example.co.uk')
    expect(normalizeDomain('127.0.0.1')).toBeNull()
    expect(normalizeDomain('not a domain')).toBeNull()
  })
})

describe('feed rendering', () => {
  const doc: FeedDocument = {
    title: 'Refetch: Top & best',
    description: 'Stories',
    pageUrl: 'https://refetch.io/',
    feedUrl: 'https://refetch.io/feeds/top.xml',
    siteUrl: 'https://refetch.io',
    entries: [
      {
        id: 'p1',
        title: 'Ship <it>',
        threadUrl: 'https://refetch.io/threads/p1',
        link: 'https://example.com/a?b=1&c=2',
        summary: 'Fast & safe',
        author: 'Ada',
        points: 1,
        comments: 3,
        createdAt: '2026-11-01T10:00:00.000Z',
        categories: ['rust'],
      },
    ],
  }

  it('renders escaped RSS', () => {
    const xml = renderRss(doc)
    expect(xml).toContain('<title>Refetch: Top &amp; best</title>')
    expect(xml).toContain('<title>Ship &lt;it&gt;</title>')
    expect(xml).toContain('<link>https://example.com/a?b=1&amp;c=2</link>')
    expect(xml).toContain('<guid isPermaLink="true">https://refetch.io/threads/p1</guid>')
    expect(xml).toContain('<comments>https://refetch.io/threads/p1</comments>')
    expect(xml).toContain('<category>rust</category>')
    expect(xml).toContain('Sun, 01 Nov 2026 10:00:00 GMT')
    // The description is HTML, escaped once more for XML.
    expect(xml).toContain('&lt;p&gt;Fast &amp;amp; safe&lt;/p&gt;')
    expect(xml).toContain('1 point · ')
  })

  it('renders escaped Atom', () => {
    const xml = renderAtom(doc)
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">')
    expect(xml).toContain('<id>https://refetch.io/threads/p1</id>')
    expect(xml).toContain('<link rel="alternate" href="https://example.com/a?b=1&amp;c=2"/>')
    expect(xml).toContain('<updated>2026-11-01T10:00:00.000Z</updated>')
    expect(xml).toContain('3 comments')
  })
})

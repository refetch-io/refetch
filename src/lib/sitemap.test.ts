import { describe, expect, it } from 'vitest'
import {
  PRIVATE_PATHS,
  buildRobots,
  buildSitemap,
  buildSitemapIndex,
  isCurrentPeriod,
  monthsBetween,
  parseSitemapFile,
  periodRange,
  sitemapFileName,
  yearsBetween,
} from './sitemap'

describe('buildSitemap', () => {
  it('writes a urlset with escaped locations and day-precision dates', () => {
    const xml = buildSitemap([
      { loc: 'https://refetch.io/', lastmod: '2026-10-27T10:00:00.000Z', changefreq: 'hourly', priority: 1 },
      { loc: 'https://refetch.io/channels/a&b' },
    ])
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain(
      '<url><loc>https://refetch.io/</loc><lastmod>2026-10-27</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>',
    )
    expect(xml).toContain('<loc>https://refetch.io/channels/a&amp;b</loc>')
  })
})

describe('buildSitemapIndex', () => {
  it('lists child sitemaps with day-precision dates', () => {
    const xml = buildSitemapIndex([
      { loc: 'https://refetch.io/sitemaps/pages.xml', lastmod: '2026-10-28T08:00:00.000Z' },
      { loc: 'https://refetch.io/sitemaps/threads-2026-09.xml' },
    ])
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain(
      '<sitemap><loc>https://refetch.io/sitemaps/pages.xml</loc><lastmod>2026-10-28</lastmod></sitemap>',
    )
    expect(xml).toContain('<sitemap><loc>https://refetch.io/sitemaps/threads-2026-09.xml</loc></sitemap>')
  })
})

describe('sitemap files', () => {
  it('round-trips file names, with page 1 unsuffixed', () => {
    for (const name of [
      'pages.xml',
      'topics.xml',
      'topics-p2.xml',
      'threads-2026-10.xml',
      'threads-2026-10-p2.xml',
      'threads-2026-10-p14.xml',
      'users-2026.xml',
      'users-2026-p3.xml',
    ]) {
      expect(sitemapFileName(parseSitemapFile(name)!)).toBe(name)
    }
    expect(parseSitemapFile('threads-2026-10-p12.xml')).toEqual({
      kind: 'threads',
      period: '2026-10',
      page: 12,
    })
    expect(sitemapFileName({ kind: 'users', period: '2026', page: 1 })).toBe('users-2026.xml')
  })

  it('rejects anything else, including duplicate spellings of page 1', () => {
    for (const name of [
      'threads-2026-13.xml',
      'threads-2026.xml',
      'users-2026-10.xml',
      'threads-2026-10-p1.xml',
      'threads-2026-10-p0.xml',
      'threads-2026-10-p02.xml',
      'topics-p1.xml',
      'pages-p2.xml',
      'sitemap.xml',
      '../x',
    ]) {
      expect(parseSitemapFile(name)).toBeNull()
    }
  })

  it('bounds months and years in UTC', () => {
    expect(periodRange('2026-12')).toEqual({
      start: '2026-12-01T00:00:00.000Z',
      end: '2027-01-01T00:00:00.000Z',
    })
    expect(periodRange('2026')).toEqual({
      start: '2026-01-01T00:00:00.000Z',
      end: '2027-01-01T00:00:00.000Z',
    })
  })

  it('lists every period from the first one, newest first', () => {
    expect(monthsBetween('2025-11-16T23:43:31.900+00:00', '2026-02-03T00:00:00.000Z')).toEqual([
      '2026-02',
      '2026-01',
      '2025-12',
      '2025-11',
    ])
    expect(monthsBetween('2026-10-01T00:00:00.000Z', '2026-10-28T00:00:00.000Z')).toEqual(['2026-10'])
    expect(yearsBetween('2024-05-01T00:00:00.000Z', '2026-10-28T00:00:00.000Z')).toEqual([
      '2026',
      '2025',
      '2024',
    ])
  })

  it('knows which period is still growing', () => {
    const now = '2026-10-28T12:00:00.000Z'
    expect(isCurrentPeriod('2026-10', now)).toBe(true)
    expect(isCurrentPeriod('2026', now)).toBe(true)
    expect(isCurrentPeriod('2026-09', now)).toBe(false)
  })
})

describe('buildRobots', () => {
  const robots = buildRobots('https://refetch.io')

  it('keeps personal pages out of search and points at the sitemap', () => {
    for (const path of PRIVATE_PATHS) expect(robots).toContain(`Disallow: ${path}`)
    expect(robots).toContain('Sitemap: https://refetch.io/sitemap.xml')
  })

  it('lets stories, channels, topics and profiles be crawled', () => {
    for (const path of ['/threads/', '/channels/', '/users/', '/topics/']) {
      expect(PRIVATE_PATHS.some((blocked) => path.startsWith(blocked))).toBe(false)
    }
  })
})

import { describe, expect, it } from 'vitest'
import { PRIVATE_PATHS, buildRobots, buildSitemap } from './sitemap'

describe('buildSitemap', () => {
  it('writes a urlset with escaped locations and day-precision dates', () => {
    const xml = buildSitemap([
      { loc: 'https://refetch.io/', lastmod: '2026-10-27T10:00:00.000Z', changefreq: 'hourly', priority: 1 },
      { loc: 'https://refetch.io/c/a&b' },
    ])
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain(
      '<url><loc>https://refetch.io/</loc><lastmod>2026-10-27</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>',
    )
    expect(xml).toContain('<loc>https://refetch.io/c/a&amp;b</loc>')
  })
})

describe('buildRobots', () => {
  const robots = buildRobots('https://refetch.io')

  it('keeps personal pages out of search and points at the sitemap', () => {
    for (const path of PRIVATE_PATHS) expect(robots).toContain(`Disallow: ${path}`)
    expect(robots).toContain('Sitemap: https://refetch.io/sitemap.xml')
  })

  it('lets stories, channels and profiles be crawled', () => {
    for (const path of ['/threads/', '/c/', '/u/']) {
      expect(PRIVATE_PATHS.some((blocked) => path.startsWith(blocked))).toBe(false)
    }
  })
})

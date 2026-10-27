import { escapeHtml } from './email'

export interface SitemapEntry {
  /** Absolute URL. */
  loc: string
  /** ISO date of the last change. */
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly'
  priority?: number
}

export function buildSitemap(entries: Array<SitemapEntry>): string {
  const urls = entries.map((entry) => {
    const parts = [`<loc>${escapeHtml(entry.loc)}</loc>`]
    if (entry.lastmod) parts.push(`<lastmod>${entry.lastmod.slice(0, 10)}</lastmod>`)
    if (entry.changefreq) parts.push(`<changefreq>${entry.changefreq}</changefreq>`)
    if (entry.priority !== undefined) parts.push(`<priority>${entry.priority.toFixed(1)}</priority>`)
    return `  <url>${parts.join('')}</url>`
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
}

/** Pages that are personal or have no content of their own. */
export const PRIVATE_PATHS = [
  '/api/',
  '/auth/',
  '/messages',
  '/me',
  '/mines',
  '/saved',
  '/notifications',
  '/moderation',
  '/submit',
  '/signin',
  '/signup',
  '/welcome',
  '/design',
]

export function buildRobots(siteUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
    // Story previews used for social cards are fine to fetch.
    'Allow: /api/og/',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')
}

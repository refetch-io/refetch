import { escapeHtml } from './email'

/**
 * Rows per paginated sitemap file. Well under the 50,000 URL limit
 * (sitemaps.org) so a file builds in a few requests, and a page of profiles can
 * add each one's comments URL without overflowing.
 */
export const SITEMAP_PAGE_SIZE = 5_000

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

export interface SitemapIndexEntry {
  /** Absolute URL of a child sitemap. */
  loc: string
  lastmod?: string
}

/** The sitemap of sitemaps served at `/sitemap.xml`. */
export function buildSitemapIndex(entries: Array<SitemapIndexEntry>): string {
  const sitemaps = entries.map((entry) => {
    const parts = [`<loc>${escapeHtml(entry.loc)}</loc>`]
    if (entry.lastmod) parts.push(`<lastmod>${entry.lastmod.slice(0, 10)}</lastmod>`)
    return `  <sitemap>${parts.join('')}</sitemap>`
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemaps,
    '</sitemapindex>',
    '',
  ].join('\n')
}

/*
 * Child sitemaps live at `/sitemaps/<file>`. Stories are split by the month
 * they were posted and people by the year they joined, and every split (and
 * the topics) is paginated: page 1 is `threads-2026-10.xml`, then
 * `threads-2026-10-p2.xml` and so on. Pages run oldest first, so new rows only
 * ever land on the last page and earlier pages keep their URLs.
 */
export type SitemapFile =
  | { kind: 'pages' }
  | { kind: 'topics'; page: number }
  | { kind: 'threads'; period: string; page: number }
  | { kind: 'users'; period: string; page: number }

export function sitemapFileName(file: SitemapFile): string {
  const parts: Array<string> = [file.kind]
  if ('period' in file) parts.push(file.period)
  if ('page' in file && file.page > 1) parts.push(`p${file.page}`)
  return `${parts.join('-')}.xml`
}

export function parseSitemapFile(name: string): SitemapFile | null {
  if (name === 'pages.xml') return { kind: 'pages' }
  // Page 1 has no suffix, so `-p1` (or a leading zero) would duplicate another URL.
  const match = /^(topics|threads-(\d{4}-(?:0[1-9]|1[0-2]))|users-(\d{4}))(?:-p([2-9]|[1-9]\d+))?\.xml$/.exec(
    name,
  )
  if (!match) return null
  const page = match[4] ? Number(match[4]) : 1
  if (match[1] === 'topics') return { kind: 'topics', page }
  if (match[2]) return { kind: 'threads', period: match[2], page }
  return { kind: 'users', period: match[3], page }
}

/** UTC bounds of a `YYYY` or `YYYY-MM` period: `[start, end)`. */
export function periodRange(period: string): { start: string; end: string } {
  const [year, month] = period.split('-').map(Number)
  const start = month ? Date.UTC(year, month - 1, 1) : Date.UTC(year, 0, 1)
  const end = month ? Date.UTC(year, month, 1) : Date.UTC(year + 1, 0, 1)
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() }
}

/** Every month from `from` to `to` (ISO dates), newest first, as `YYYY-MM`. */
export function monthsBetween(from: string, to: string): Array<string> {
  const months: Array<string> = []
  const first = new Date(from)
  const last = new Date(to)
  let year = last.getUTCFullYear()
  let month = last.getUTCMonth()
  while (year > first.getUTCFullYear() || (year === first.getUTCFullYear() && month >= first.getUTCMonth())) {
    months.push(`${year}-${String(month + 1).padStart(2, '0')}`)
    if (--month < 0) {
      month = 11
      year--
    }
  }
  return months
}

/** Every year from `from` to `to` (ISO dates), newest first. */
export function yearsBetween(from: string, to: string): Array<string> {
  const years: Array<string> = []
  for (let year = new Date(to).getUTCFullYear(); year >= new Date(from).getUTCFullYear(); year--) {
    years.push(String(year))
  }
  return years
}

/** True when `now` falls inside the period, so its sitemap still grows. */
export function isCurrentPeriod(period: string, now: string): boolean {
  const { start, end } = periodRange(period)
  return start <= now && now < end
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
    // Story previews used for social cards are fine to fetch. Listed before `Disallow: /api/`
    // because some crawlers (X's card fetcher among them) take the first matching rule.
    'Allow: /api/og/',
    ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')
}

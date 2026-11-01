/*
 * RSS 2.0 and Atom feeds for every story list: the front page, Newest, Show,
 * each channel, topic, person and site. `/feeds/top.xml` is RSS and
 * `/feeds/top.atom` is the same list as Atom.
 */

export type FeedFormat = 'rss' | 'atom'

export type FeedSource =
  | { kind: 'top' | 'new' | 'show' }
  | { kind: 'channel'; id: string }
  | { kind: 'topic'; key: string }
  | { kind: 'user'; id: string }
  | { kind: 'domain'; domain: string }

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/
const ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/
const DOMAIN = /^(?=.{3,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/

/** A site as the domain pages address it: lowercase, no `www.`. Null when it isn't a hostname. */
export function normalizeDomain(raw: string): string | null {
  const domain = raw
    .trim()
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\.$/, '')
  return DOMAIN.test(domain) && /[a-z]/.test(domain.split('.').at(-1) ?? '') ? domain : null
}

/** `top.xml`, `channels/rust.atom`, `from/github.com.xml` → what to list and how. */
export function parseFeedPath(path: string): { source: FeedSource; format: FeedFormat } | null {
  const match = /^(.+)\.(xml|atom)$/.exec(path.replace(/^\/+/, ''))
  if (!match) return null
  const format: FeedFormat = match[2] === 'atom' ? 'atom' : 'rss'
  const parts = match[1].split('/')
  if (parts.length === 1) {
    const kind = parts[0]
    return kind === 'top' || kind === 'new' || kind === 'show' ? { source: { kind }, format } : null
  }
  if (parts.length !== 2) return null
  const [section, value] = parts
  if (section === 'channels' && SLUG.test(value)) return { source: { kind: 'channel', id: value }, format }
  if (section === 'topics' && SLUG.test(value)) return { source: { kind: 'topic', key: value }, format }
  if (section === 'users' && ID.test(value)) return { source: { kind: 'user', id: value }, format }
  if (section === 'from') {
    const domain = normalizeDomain(value)
    return domain ? { source: { kind: 'domain', domain }, format } : null
  }
  return null
}

/** The path of a list's feed, e.g. `/feeds/channels/rust.xml`. */
export function feedPath(source: FeedSource, format: FeedFormat = 'rss'): string {
  const ext = format === 'atom' ? 'atom' : 'xml'
  switch (source.kind) {
    case 'top':
    case 'new':
    case 'show':
      return `/feeds/${source.kind}.${ext}`
    case 'channel':
      return `/feeds/channels/${source.id}.${ext}`
    case 'topic':
      return `/feeds/topics/${source.key}.${ext}`
    case 'user':
      return `/feeds/users/${source.id}.${ext}`
    case 'domain':
      return `/feeds/from/${source.domain}.${ext}`
  }
}

/** `<link rel="alternate">` tags so feed readers find a page's feeds. */
export function feedLinks(siteUrl: string, source: FeedSource, title: string) {
  return [
    {
      rel: 'alternate',
      type: 'application/rss+xml',
      title,
      href: `${siteUrl}${feedPath(source, 'rss')}`,
    },
    {
      rel: 'alternate',
      type: 'application/atom+xml',
      title,
      href: `${siteUrl}${feedPath(source, 'atom')}`,
    },
  ]
}

export interface FeedEntry {
  id: string
  title: string
  /** The discussion on Refetch. */
  threadUrl: string
  /** The article itself, or the discussion for posts without a link. */
  link: string
  /** AI summary or the submitter's note; may be empty. */
  summary: string
  author: string
  points: number
  comments: number
  createdAt: string
  categories: Array<string>
}

export interface FeedDocument {
  title: string
  description: string
  /** The HTML page this feed mirrors. */
  pageUrl: string
  /** The feed's own URL. */
  feedUrl: string
  siteUrl: string
  entries: Array<FeedEntry>
}

export function escapeXml(text: string): string {
  return (
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      // Control characters aren't allowed in XML 1.0.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  )
}

function plural(count: number, word: string) {
  return `${count} ${count === 1 ? word : `${word}s`}`
}

/** Entry body: the summary, then points and a link to the discussion (HTML, escaped by the caller). */
function entryHtml(entry: FeedEntry): string {
  const summary = entry.summary ? `<p>${escapeXml(entry.summary)}</p>` : ''
  return `${summary}<p>${plural(entry.points, 'point')} · <a href="${escapeXml(entry.threadUrl)}">${plural(entry.comments, 'comment')}</a></p>`
}

function newest(entries: Array<FeedEntry>): string {
  const times = entries.map((entry) => new Date(entry.createdAt).getTime()).filter(Number.isFinite)
  return new Date(times.length ? Math.max(...times) : Date.now()).toISOString()
}

export function renderRss(doc: FeedDocument): string {
  const items = doc.entries
    .map(
      (entry) => `    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${escapeXml(entry.link)}</link>
      <comments>${escapeXml(entry.threadUrl)}</comments>
      <guid isPermaLink="true">${escapeXml(entry.threadUrl)}</guid>
      <pubDate>${new Date(entry.createdAt).toUTCString()}</pubDate>
      <dc:creator>${escapeXml(entry.author)}</dc:creator>
${entry.categories.map((category) => `      <category>${escapeXml(category)}</category>\n`).join('')}      <description>${escapeXml(entryHtml(entry))}</description>
    </item>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(doc.title)}</title>
    <link>${escapeXml(doc.pageUrl)}</link>
    <description>${escapeXml(doc.description)}</description>
    <language>en</language>
    <lastBuildDate>${new Date(newest(doc.entries)).toUTCString()}</lastBuildDate>
    <ttl>15</ttl>
    <atom:link href="${escapeXml(doc.feedUrl)}" rel="self" type="application/rss+xml"/>
    <image>
      <url>${escapeXml(`${doc.siteUrl}/icons/icon-192.png`)}</url>
      <title>${escapeXml(doc.title)}</title>
      <link>${escapeXml(doc.pageUrl)}</link>
    </image>
${items}
  </channel>
</rss>
`
}

export function renderAtom(doc: FeedDocument): string {
  const entries = doc.entries
    .map(
      (entry) => `  <entry>
    <title>${escapeXml(entry.title)}</title>
    <id>${escapeXml(entry.threadUrl)}</id>
    <link rel="alternate" href="${escapeXml(entry.link)}"/>
    <link rel="replies" type="text/html" href="${escapeXml(entry.threadUrl)}"/>
    <published>${new Date(entry.createdAt).toISOString()}</published>
    <updated>${new Date(entry.createdAt).toISOString()}</updated>
    <author><name>${escapeXml(entry.author)}</name></author>
${entry.categories.map((category) => `    <category term="${escapeXml(category)}"/>\n`).join('')}    <content type="html">${escapeXml(entryHtml(entry))}</content>
  </entry>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(doc.title)}</title>
  <subtitle>${escapeXml(doc.description)}</subtitle>
  <id>${escapeXml(doc.pageUrl)}</id>
  <link rel="alternate" type="text/html" href="${escapeXml(doc.pageUrl)}"/>
  <link rel="self" type="application/atom+xml" href="${escapeXml(doc.feedUrl)}"/>
  <updated>${newest(doc.entries)}</updated>
  <icon>${escapeXml(`${doc.siteUrl}/icons/icon-192.png`)}</icon>
${entries}
</feed>
`
}

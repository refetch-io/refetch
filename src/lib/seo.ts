export const SITE_NAME = 'Refetch'
export const SITE_URL = 'https://refetch.io'
export const DEFAULT_DESCRIPTION =
  'Refetch is an open-source alternative to Hacker News, featuring curated tech news, discussions, and community-driven content.'
export const DEFAULT_IMAGE = `${SITE_URL}/og.png`

interface SeoInput {
  title: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'article'
  noindex?: boolean
}

/** Title, description, Open Graph and Twitter tags for `head()`. */
export function seo({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noindex,
}: SeoInput) {
  const meta: Array<Record<string, string>> = [
    { title },
    { name: 'description', content: description },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:type', content: type },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: image },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: '@refetch_io' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
  ]
  if (url) meta.push({ property: 'og:url', content: url })
  if (noindex) meta.push({ name: 'robots', content: 'noindex, nofollow' })
  return meta
}

/** Structured data for `head().scripts`. `<` is escaped so a title can't close the tag. */
export function jsonLd(data: Record<string, unknown>) {
  return {
    type: 'application/ld+json',
    children: JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c'),
  }
}

/** Trail of links above a page in search results; the last item is the page itself. */
export function breadcrumbs(items: Array<{ name: string; url: string }>) {
  return jsonLd({
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  })
}

/** A listing page (a channel, a topic) and the stories on it, numbered from `offset + 1`. */
export function collectionPage({
  siteUrl,
  url,
  name,
  description,
  items,
  offset = 0,
}: {
  siteUrl: string
  url: string
  name: string
  description: string
  items: Array<{ name: string; url: string }>
  offset?: number
}) {
  return jsonLd({
    '@type': 'CollectionPage',
    name,
    description,
    url,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: siteUrl },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: offset + index + 1,
        url: item.url,
        name: item.name,
      })),
    },
  })
}

/** Search snippets are cut near 160 characters; end on a word. */
export function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length).replace(/[,.;:]$/, '')}…`
}

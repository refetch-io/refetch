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

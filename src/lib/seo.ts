import { FEED_PAGE_SIZE, LINKS } from './constants'

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
  type?: 'website' | 'article' | 'profile'
  /** For articles: when it was posted. */
  publishedTime?: string
  noindex?: boolean
}

/** Title, description, Open Graph and Twitter tags for `head()`. */
export function seo({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  publishedTime,
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
  if (publishedTime) meta.push({ property: 'article:published_time', content: publishedTime })
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

/** The site and the organization behind it, for the home page (Google reads it from there). */
export function siteIdentity(siteUrl: string) {
  const organization = {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: SITE_NAME,
    url: `${siteUrl}/`,
    logo: { '@type': 'ImageObject', url: `${siteUrl}/icons/icon-512.png`, width: 512, height: 512 },
    sameAs: [LINKS.github, LINKS.x],
  }
  return jsonLd({
    '@graph': [
      organization,
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: SITE_NAME,
        url: `${siteUrl}/`,
        description: DEFAULT_DESCRIPTION,
        inLanguage: 'en',
        publisher: { '@id': organization['@id'] },
      },
    ],
  })
}

/** Votes and replies as schema.org counters. */
function interactions({ likes, comments }: { likes: number; comments?: number }) {
  const stats = [
    {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/LikeAction',
      userInteractionCount: Math.max(0, likes),
    },
  ]
  if (comments !== undefined) {
    stats.push({
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/CommentAction',
      userInteractionCount: Math.max(0, comments),
    })
  }
  return stats
}

/** A person, or the site itself for automated (Scout) posts. */
function author(siteUrl: string, person: { id: string; name: string; bot: boolean }) {
  if (person.bot) return { '@type': 'Organization', name: SITE_NAME, url: `${siteUrl}/` }
  return { '@type': 'Person', name: person.name, url: `${siteUrl}/users/${person.id}` }
}

export interface StructuredComment {
  id: string
  author: { id: string; name: string; bot: boolean }
  text: string
  createdAt: string
  editedAt: string | null
  votes: number
  replies: Array<StructuredComment>
}

/** A story page: Google's discussion forum markup, with its comments and the article it links to. */
export function discussionForumPosting({
  siteUrl,
  url,
  headline,
  text,
  image,
  createdAt,
  author: by,
  votes,
  commentCount,
  link,
  keywords,
  channel,
  comments,
}: {
  siteUrl: string
  url: string
  headline: string
  text: string
  image: string
  createdAt: string
  author: { id: string; name: string; bot: boolean }
  votes: number
  commentCount: number
  link: string | null
  keywords: Array<string>
  channel: { name: string; url: string } | null
  comments: Array<StructuredComment>
}) {
  const comment = (node: StructuredComment): Record<string, unknown> => ({
    '@type': 'Comment',
    '@id': `${url}#comment-${node.id}`,
    url: `${url}#comment-${node.id}`,
    author: author(siteUrl, node.author),
    datePublished: node.createdAt,
    ...(node.editedAt ? { dateModified: node.editedAt } : {}),
    text: node.text,
    interactionStatistic: interactions({ likes: node.votes }),
    ...(node.replies.length ? { comment: node.replies.map(comment) } : {}),
  })
  return jsonLd({
    '@type': 'DiscussionForumPosting',
    '@id': url,
    url,
    mainEntityOfPage: url,
    headline,
    text,
    image,
    datePublished: createdAt,
    author: author(siteUrl, by),
    interactionStatistic: interactions({ likes: votes, comments: commentCount }),
    inLanguage: 'en',
    ...(keywords.length ? { keywords: keywords.join(', ') } : {}),
    ...(link ? { sharedContent: { '@type': 'WebPage', url: link } } : {}),
    isPartOf: channel
      ? { '@type': 'CollectionPage', name: channel.name, url: channel.url }
      : { '@type': 'WebSite', name: SITE_NAME, url: `${siteUrl}/` },
    ...(comments.length ? { comment: comments.map(comment) } : {}),
  })
}

/** A profile page and the person (or the Scout bot) it's about. */
export function profilePage({
  siteUrl,
  url,
  person,
}: {
  siteUrl: string
  url: string
  person: {
    id: string
    name: string
    bio: string
    website: string | null
    joinedAt: string | null
    isBot: boolean
    stats: { karma: number; stories: number; comments: number; followers: number; following: number }
  }
}) {
  const profileUrl = `${siteUrl}/users/${person.id}`
  return jsonLd({
    '@type': 'ProfilePage',
    url,
    ...(person.joinedAt ? { dateCreated: person.joinedAt } : {}),
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${siteUrl}/` },
    mainEntity: {
      '@type': person.isBot ? 'Organization' : 'Person',
      '@id': `${profileUrl}#person`,
      name: person.name,
      identifier: person.id,
      url: profileUrl,
      ...(person.bio ? { description: person.bio } : {}),
      ...(person.website ? { sameAs: [person.website] } : {}),
      interactionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/FollowAction',
          userInteractionCount: person.stats.followers,
        },
      ],
      agentInteractionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/WriteAction',
          userInteractionCount: person.stats.stories,
        },
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/CommentAction',
          userInteractionCount: person.stats.comments,
        },
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/FollowAction',
          userInteractionCount: person.stats.following,
        },
      ],
    },
  })
}

/** Head tags for a front-page feed (Top, New, Show); later pages are their own canonical pages. */
export function feedHead({
  siteUrl,
  path,
  page,
  title,
  description,
  name,
  stories,
  home,
}: {
  siteUrl: string
  path: string
  page: number
  title: string
  description: string
  name: string
  stories: Array<{ id: string; title: string }>
  home?: boolean
}) {
  const base = `${siteUrl}${path}`
  const url = page > 1 ? `${base}?page=${page}` : base
  const scripts = [
    collectionPage({
      siteUrl,
      url,
      name,
      description,
      items: stories.map((story) => ({ name: story.title, url: `${siteUrl}/threads/${story.id}` })),
      offset: (page - 1) * FEED_PAGE_SIZE,
    }),
  ]
  if (!home)
    scripts.push(
      breadcrumbs([
        { name: SITE_NAME, url: `${siteUrl}/` },
        { name, url: base },
      ]),
    )
  else if (page === 1) scripts.unshift(siteIdentity(siteUrl))
  return {
    meta: seo({ title: page > 1 ? `${title} (page ${page})` : title, description, url }),
    links: [{ rel: 'canonical', href: url }],
    scripts,
  }
}

/** Search snippets are cut near 160 characters; end on a word. */
export function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length).replace(/[,.;:]$/, '')}…`
}

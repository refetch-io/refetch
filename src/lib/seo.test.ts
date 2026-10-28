import { describe, expect, it } from 'vitest'
import { discussionForumPosting, feedHead, profilePage, siteIdentity } from './seo'

const site = 'https://refetch.io'
const parse = (script: { children: string }) => JSON.parse(script.children)

describe('discussionForumPosting', () => {
  const script = discussionForumPosting({
    siteUrl: site,
    url: `${site}/threads/abc`,
    headline: 'A </script> title',
    text: 'Summary',
    image: `${site}/api/og/thread/abc`,
    createdAt: '2026-10-27T10:00:00.000Z',
    author: { id: '0', name: 'Scout', bot: true },
    votes: -2,
    commentCount: 1,
    link: 'https://example.com/post',
    keywords: ['Rust', 'WebAssembly'],
    channel: { name: 'Rust', url: `${site}/channels/rust` },
    comments: [
      {
        id: 'c1',
        author: { id: 'u1', name: 'Ada', bot: false },
        text: 'Nice',
        createdAt: '2026-10-27T11:00:00.000Z',
        editedAt: null,
        votes: 3,
        replies: [],
      },
    ],
  })
  const data = parse(script)

  it('escapes `<` so a title cannot close the script tag', () => {
    expect(script.children).not.toContain('</script>')
    expect(data.headline).toBe('A </script> title')
  })

  it('describes the post, its link, channel and comments', () => {
    expect(data['@type']).toBe('DiscussionForumPosting')
    expect(data.author).toEqual({ '@type': 'Organization', name: 'Refetch', url: `${site}/` })
    expect(data.sharedContent).toEqual({ '@type': 'WebPage', url: 'https://example.com/post' })
    expect(data.isPartOf.url).toBe(`${site}/channels/rust`)
    expect(data.keywords).toBe('Rust, WebAssembly')
    expect(data.interactionStatistic[0].userInteractionCount).toBe(0)
    expect(data.comment[0]).toMatchObject({
      '@type': 'Comment',
      url: `${site}/threads/abc#comment-c1`,
      author: { '@type': 'Person', name: 'Ada', url: `${site}/users/u1` },
      text: 'Nice',
    })
    expect(data.comment[0].comment).toBeUndefined()
  })
})

describe('profilePage', () => {
  it('puts the person and their counters in mainEntity', () => {
    const data = parse(
      profilePage({
        siteUrl: site,
        url: `${site}/users/u1`,
        person: {
          id: 'u1',
          name: 'Ada',
          bio: 'Writes compilers',
          website: 'https://ada.dev',
          joinedAt: '2026-01-01T00:00:00.000Z',
          isBot: false,
          stats: { karma: 10, stories: 4, comments: 7, followers: 12, following: 3 },
        },
      }),
    )
    expect(data['@type']).toBe('ProfilePage')
    expect(data.dateCreated).toBe('2026-01-01T00:00:00.000Z')
    expect(data.mainEntity).toMatchObject({ '@type': 'Person', name: 'Ada', sameAs: ['https://ada.dev'] })
    expect(data.mainEntity.interactionStatistic[0].userInteractionCount).toBe(12)
  })
})

describe('feedHead', () => {
  const stories = [{ id: 's1', title: 'One' }]

  it('adds the site identity to the first home page only', () => {
    const first = feedHead({
      siteUrl: site,
      path: '/',
      page: 1,
      title: 'T',
      description: 'D',
      name: 'Top',
      stories,
      home: true,
    })
    expect(first.links).toEqual([{ rel: 'canonical', href: `${site}/` }])
    expect(parse(first.scripts[0])['@graph'].map((node: { '@type': string }) => node['@type'])).toEqual([
      'Organization',
      'WebSite',
    ])
    const second = feedHead({
      siteUrl: site,
      path: '/',
      page: 2,
      title: 'T',
      description: 'D',
      name: 'Top',
      stories,
      home: true,
    })
    expect(second.links).toEqual([{ rel: 'canonical', href: `${site}/?page=2` }])
    expect(second.scripts).toHaveLength(1)
    expect(parse(second.scripts[0]).mainEntity.itemListElement[0].position).toBe(26)
  })

  it('gives other feeds breadcrumbs', () => {
    const head = feedHead({
      siteUrl: site,
      path: '/new',
      page: 1,
      title: 'T',
      description: 'D',
      name: 'New',
      stories,
    })
    expect(head.scripts.map((script) => parse(script)['@type'])).toEqual(['CollectionPage', 'BreadcrumbList'])
  })
})

describe('siteIdentity', () => {
  it('links the website to its publisher', () => {
    const [organization, website] = parse(siteIdentity(site))['@graph']
    expect(website.publisher).toEqual({ '@id': organization['@id'] })
  })
})

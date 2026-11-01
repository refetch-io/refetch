import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { z } from 'zod'
import type { DomainAbout, FeedPage } from '@/lib/types'
import { FEED_MAX_PAGES } from '@/lib/constants'
import { normalizeDomain } from '@/lib/feeds'
import { getDomainAbout, listDomainFeed } from '@/server/domains.server'
import { getSessionUser } from '@/server/session.server'

export const fetchDomainFeed = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      domain: z.string().max(253),
      sort: z.enum(['new', 'top']),
      page: z.number().int().min(1).max(FEED_MAX_PAGES),
    }),
  )
  .handler(async ({ data }): Promise<{ domain: string; feed: FeedPage; about: DomainAbout }> => {
    const domain = normalizeDomain(data.domain)
    if (!domain) throw notFound()
    const user = await getSessionUser()
    const [feed, about] = await Promise.all([
      listDomainFeed(domain, data.sort, data.page, user?.id),
      getDomainAbout(domain),
    ])
    // Nobody has shared anything from this site.
    if (about.stories === 0 && feed.posts.length === 0) throw notFound()
    return { domain, feed, about }
  })

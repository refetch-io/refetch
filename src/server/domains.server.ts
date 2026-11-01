import type { DomainAbout, DomainSort, FeedPage } from '@/lib/types'
import { queryPosts } from './channels.server'
import { Query, db } from './db.server'

/*
 * Domain pages (`/from/github.com`): every story linking to one site. Posts
 * store the full link, so a site is matched by its URL prefixes (indexed on
 * `link`); `www.` and plain http count as the same site.
 */

const WEEK = 7 * 24 * 60 * 60 * 1000

function domainFilter(domain: string) {
  const prefixes = ['https://', 'http://'].flatMap((scheme) => [
    `${scheme}${domain}/`,
    `${scheme}www.${domain}/`,
  ])
  return Query.or(prefixes.map((prefix) => Query.startsWith('link', prefix)))
}

export function listDomainFeed(
  domain: string,
  sort: DomainSort,
  page: number,
  userId?: string,
): Promise<FeedPage> {
  return queryPosts(
    [domainFilter(domain)],
    sort === 'top'
      ? [Query.orderDesc('count'), Query.orderDesc('score'), Query.orderDesc('$createdAt')]
      : [Query.orderDesc('$createdAt')],
    page,
    userId,
  )
}

const aboutCache = new Map<string, { about: DomainAbout; expires: number }>()
const ABOUT_TTL = 10 * 60_000

/** How many stories link to the site, all time and this week (cached for ten minutes). */
export async function getDomainAbout(domain: string): Promise<DomainAbout> {
  const hit = aboutCache.get(domain)
  if (hit && hit.expires > Date.now()) return hit.about
  const { tables, ids } = db()
  const count = (filters: Array<string>) =>
    tables
      .listRows({
        databaseId: ids.databaseId,
        tableId: ids.posts,
        queries: [domainFilter(domain), ...filters, Query.limit(1), Query.select(['$id'])],
        total: true,
      })
      .then((result) => result.total)
      .catch(() => 0)
  const [stories, weeklyStories] = await Promise.all([
    count([]),
    count([Query.greaterThan('$createdAt', new Date(Date.now() - WEEK).toISOString())]),
  ])
  const about = { stories, weeklyStories }
  aboutCache.delete(domain)
  aboutCache.set(domain, { about, expires: Date.now() + ABOUT_TTL })
  if (aboutCache.size > 500) aboutCache.delete(aboutCache.keys().next().value!)
  return about
}

import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowUpRight, Globe } from 'lucide-react'
import { z } from 'zod'
import { FEED_MAX_PAGES, FEED_PAGE_SIZE } from '@/lib/constants'
import { feedLinks, normalizeDomain } from '@/lib/feeds'
import { configQuery, domainFeedQuery } from '@/lib/queries'
import { breadcrumbs, clampDescription, collectionPage, seo } from '@/lib/seo'
import type { DomainAbout, DomainSort } from '@/lib/types'
import { compactNumber } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/misc'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Favicon } from '@/components/favicon'
import { FeedList, FeedSkeleton } from '@/components/feed/feed-view'
import { FeedLayout } from '@/components/feed/feed-layout'
import { RssButton } from '@/components/feed/rss-button'
import { SponsorCard } from '@/components/insights/insights-rail'
import { MuteButton } from '@/components/mutes/mute-parts'

/** Sites with fewer stories than this stay out of search results (thin pages). */
const MIN_INDEXED_STORIES = 5

const searchSchema = z.object({
  sort: z.enum(['new', 'top']).optional().catch(undefined),
  page: z.number().int().min(2).max(FEED_MAX_PAGES).optional().catch(undefined),
})

export const Route = createFileRoute('/_app/from/$domain')({
  validateSearch: searchSchema,
  // One address per site: `/from/www.GitHub.com` → `/from/github.com`.
  beforeLoad: ({ params, search }) => {
    const domain = normalizeDomain(params.domain)
    if (domain && domain !== params.domain) {
      throw redirect({ to: '/from/$domain', params: { domain }, search, statusCode: 301 })
    }
  },
  loaderDeps: ({ search }) => ({ sort: (search.sort ?? 'new') as DomainSort, page: search.page ?? 1 }),
  loader: async ({ context, params, deps }) => {
    const [data, config] = await Promise.all([
      context.queryClient.ensureQueryData(
        domainFeedQuery(params.domain, deps.sort, deps.page, context.user?.id ?? null),
      ),
      context.queryClient.ensureQueryData(configQuery()),
    ])
    return {
      stories: data.feed.posts.map((post) => ({ id: post.id, title: post.title })),
      total: data.about.stories,
      siteUrl: config.siteUrl,
      ...deps,
    }
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: seo({ title: 'Site | Refetch', noindex: true }) }
    const { total, sort, page, siteUrl } = loaderData
    const domain = params.domain
    const base = `${siteUrl}/from/${domain}`
    const url = sort === 'new' && page > 1 ? `${base}?page=${page}` : base
    const title = `Stories from ${domain}${page > 1 ? ` (page ${page})` : ''} | Refetch`
    const description = clampDescription(
      `${compactNumber(total)} ${total === 1 ? 'story' : 'stories'} from ${domain} shared and discussed by the Refetch community.`,
    )
    return {
      meta: seo({ title, description, url, noindex: total < MIN_INDEXED_STORIES }),
      links: [
        { rel: 'canonical', href: url },
        ...feedLinks(siteUrl, { kind: 'domain', domain }, `Refetch: Stories from ${domain}`),
      ],
      scripts: [
        collectionPage({
          siteUrl,
          url,
          name: `Stories from ${domain} on Refetch`,
          description,
          items: loaderData.stories.map((story) => ({
            name: story.title,
            url: `${siteUrl}/threads/${story.id}`,
          })),
          offset: (page - 1) * FEED_PAGE_SIZE,
        }),
        breadcrumbs([
          { name: 'Refetch', url: `${siteUrl}/` },
          { name: domain, url: base },
        ]),
      ],
    }
  },
  pendingComponent: () => (
    <FeedLayout header={<div className="mb-6 h-40 animate-pulse rounded-card bg-surface shadow-card" />}>
      <FeedSkeleton />
    </FeedLayout>
  ),
  notFoundComponent: () => (
    <Card className="mx-auto max-w-xl">
      <EmptyState
        icon={<Globe />}
        title="Nothing from this site yet"
        description="Nobody has shared a story from it on Refetch. Be the first."
        action={
          <Button asChild variant="primary" size="md">
            <Link to="/submit">Submit a story</Link>
          </Button>
        }
      />
    </Card>
  ),
  component: DomainPage,
})

function DomainPage() {
  const { domain } = Route.useParams()
  const { sort, page } = Route.useLoaderDeps()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data } = useSuspenseQuery(domainFeedQuery(domain, sort, page, user?.id ?? null))

  const header = (
    <Card className="mb-5 animate-rise-in overflow-hidden sm:mb-6">
      <div className="h-16 bg-[linear-gradient(120deg,var(--brand),color-mix(in_oklab,var(--brand)_30%,transparent))] opacity-90 sm:h-20" />
      <div className="px-4 pb-4 sm:px-6 sm:pb-5">
        <div className="-mt-10 flex items-end justify-between gap-3">
          <span className="relative rounded-[23px] bg-surface p-1 shadow-card">
            <span className="grid size-[68px] place-items-center rounded-[19px] bg-fill-secondary">
              <Favicon domain={domain} size={40} />
            </span>
          </span>
          <MuteButton kind="domain" value={domain} label={domain} size="md" className="mb-1" />
        </div>
        <h1 className="mt-4 text-title-1 break-all text-label">{domain}</h1>
        <p className="mt-1 max-w-2xl text-subhead text-pretty text-label-secondary">
          Stories from {domain}, shared and voted on by the Refetch community.{' '}
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center font-semibold text-brand-text hover:underline"
          >
            Visit the site
            <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-footnote text-label-tertiary tabular">
            {compactNumber(data.about.stories)} {data.about.stories === 1 ? 'story' : 'stories'}
          </p>
          <div className="flex items-center gap-1.5">
            <RssButton source={{ kind: 'domain', domain }} name={domain} />
            <SegmentedControl<DomainSort>
              aria-label="Sort stories"
              size="sm"
              className="w-44"
              value={sort}
              onValueChange={(value) =>
                navigate({
                  search: { sort: value === 'new' ? undefined : value, page: undefined },
                  resetScroll: false,
                })
              }
              options={[
                { value: 'new', label: 'New' },
                { value: 'top', label: 'Top' },
              ]}
            />
          </div>
        </div>
      </div>
    </Card>
  )

  return (
    <FeedLayout header={header} railLabel="About this site" rail={<DomainRail about={data.about} />}>
      <FeedList
        page={data.feed}
        ranked={sort === 'top'}
        empty={{
          title: 'No stories yet',
          description: `Stories from ${domain} will show up here once they pass the quality checks.`,
        }}
      />
    </FeedLayout>
  )
}

function DomainRail({ about }: { about: DomainAbout }) {
  return (
    <>
      <Card className="p-4">
        <dl className="grid grid-cols-2 gap-3">
          <Stat label={about.stories === 1 ? 'Story' : 'Stories'} value={compactNumber(about.stories)} />
          <Stat label="This week" value={compactNumber(about.weeklyStories)} />
        </dl>
      </Card>
      <SponsorCard />
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    // Label first for screen readers, value first on screen.
    <div className="flex flex-col-reverse rounded-xl bg-fill-secondary px-3 py-2.5">
      <dt className="text-caption-1 text-label-secondary">{label}</dt>
      <dd className="font-rounded text-title-3 font-semibold text-label tabular">{value}</dd>
    </div>
  )
}

import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Hash } from 'lucide-react'
import { z } from 'zod'
import { FEED_MAX_PAGES, FEED_PAGE_SIZE } from '@/lib/constants'
import { configQuery, topicFeedQuery } from '@/lib/queries'
import { breadcrumbs, clampDescription, collectionPage, seo } from '@/lib/seo'
import type { Topic, TopicAbout, TopicSort } from '@/lib/types'
import { compactNumber } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, SectionLabel } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/misc'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { FeedList, FeedSkeleton } from '@/components/feed/feed-view'
import { FeedLayout } from '@/components/feed/feed-layout'
import { SponsorCard } from '@/components/insights/insights-rail'
import { ChannelIcon, JoinButton, memberLabel, useChannels } from '@/components/channels/channel-parts'
import { TopicChips } from '@/components/topics/topic-parts'

/** Topics with fewer stories than this are kept out of search results (thin pages). */
const MIN_INDEXED_STORIES = 5

const searchSchema = z.object({
  sort: z.enum(['new', 'top']).optional().catch(undefined),
  page: z.number().int().min(2).max(FEED_MAX_PAGES).optional().catch(undefined),
})

export const Route = createFileRoute('/_app/topics/$topicKey')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ sort: (search.sort ?? 'new') as TopicSort, page: search.page ?? 1 }),
  loader: async ({ context, params, deps }) => {
    const [data, config] = await Promise.all([
      context.queryClient.ensureQueryData(
        topicFeedQuery(params.topicKey, deps.sort, deps.page, context.user?.id ?? null),
      ),
      context.queryClient.ensureQueryData(configQuery()),
    ])
    return {
      label: data.topic.label,
      articleCount: data.topic.articleCount,
      stories: data.feed.posts.map((post) => ({ id: post.id, title: post.title })),
      siteUrl: config.siteUrl,
      ...deps,
    }
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: seo({ title: 'Topic | Refetch', noindex: true }) }
    const { label, articleCount, sort, page, siteUrl } = loaderData
    const base = `${siteUrl}/topics/${params.topicKey}`
    // Each page of the default (newest) feed is its own page; Top folds into the topic.
    const url = sort === 'new' && page > 1 ? `${base}?page=${page}` : base
    const title = `${label} news and discussions${page > 1 ? ` (page ${page})` : ''} | Refetch`
    const description = clampDescription(
      articleCount > 0
        ? `The latest ${label} news, articles and discussions on Refetch: ${compactNumber(articleCount)} ${articleCount === 1 ? 'story' : 'stories'} picked and voted on by the community.`
        : `The latest ${label} news, articles and discussions on Refetch, picked and voted on by the community.`,
    )
    return {
      meta: seo({ title, description, url, noindex: articleCount < MIN_INDEXED_STORIES }),
      links: [{ rel: 'canonical', href: url }],
      scripts: [
        collectionPage({
          siteUrl,
          url,
          name: `${label} on Refetch`,
          description,
          items: loaderData.stories.map((story) => ({
            name: story.title,
            url: `${siteUrl}/threads/${story.id}`,
          })),
          offset: (page - 1) * FEED_PAGE_SIZE,
        }),
        breadcrumbs([
          { name: 'Refetch', url: `${siteUrl}/` },
          { name: 'Topics', url: `${siteUrl}/topics` },
          { name: label, url: base },
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
        icon={<Hash />}
        title="Topic not found"
        description="No stories are tagged with this topic yet. Browse the topics people are reading about."
        action={
          <Button asChild variant="primary" size="md">
            <Link to="/topics">Browse topics</Link>
          </Button>
        }
      />
    </Card>
  ),
  component: TopicPage,
})

function TopicPage() {
  const { topicKey } = Route.useParams()
  const { sort, page } = Route.useLoaderDeps()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data } = useSuspenseQuery(topicFeedQuery(topicKey, sort, page, user?.id ?? null))
  const { topic, about } = data

  const header = (
    <Card className="mb-5 animate-rise-in overflow-hidden sm:mb-6">
      <div className="h-16 bg-[linear-gradient(120deg,var(--brand),color-mix(in_oklab,var(--brand)_30%,transparent))] opacity-90 sm:h-20" />
      <div className="px-4 pb-4 sm:px-6 sm:pb-5">
        <div className="-mt-10 flex items-end">
          {/* Surface frame lifts the icon off the banner, like a channel's. */}
          <span className="relative rounded-[23px] bg-surface p-1 shadow-card">
            <span className="grid size-[68px] place-items-center rounded-[19px] bg-brand-tint text-brand-text">
              <Hash className="size-8" strokeWidth={2.4} aria-hidden />
            </span>
          </span>
        </div>
        <h1 className="mt-4 text-title-1 text-label">{topic.label}</h1>
        <p className="mt-1 max-w-2xl text-subhead text-pretty text-label-secondary">
          Stories about {topic.label} from across the web, tagged by Refetch and voted on by the community.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-footnote text-label-tertiary tabular">
            {topic.articleCount > 0
              ? `${compactNumber(topic.articleCount)} ${topic.articleCount === 1 ? 'story' : 'stories'}`
              : 'New topic'}
          </p>
          <SegmentedControl<TopicSort>
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
        {about.related.length > 0 && (
          // The rail carries these on wide screens.
          <TopicChips topics={about.related.slice(0, 8)} label="Related topics" className="mt-4 xl:hidden" />
        )}
      </div>
    </Card>
  )

  return (
    <FeedLayout header={header} railLabel="About this topic" rail={<TopicRail topic={topic} about={about} />}>
      <FeedList
        page={data.feed}
        ranked={sort === 'top'}
        empty={
          sort === 'top'
            ? {
                title: 'Nothing on top this month',
                description: `No ${topic.label} stories made it up the ranks in the last 30 days.`,
                action: (
                  <Button asChild variant="primary" size="md">
                    <Link to="/topics/$topicKey" params={{ topicKey }}>
                      See the newest
                    </Link>
                  </Button>
                ),
              }
            : {
                title: 'No stories yet',
                description: `Stories tagged ${topic.label} will show up here.`,
              }
        }
      />
    </FeedLayout>
  )
}

function TopicRail({ topic, about }: { topic: Topic; about: TopicAbout }) {
  const { byId } = useChannels()
  const channels = about.channels.flatMap((id) => byId.get(id) ?? [])

  return (
    <>
      <Card className="p-4">
        <dl className="grid grid-cols-2 gap-3">
          <Stat
            label={topic.articleCount === 1 ? 'Story' : 'Stories'}
            value={compactNumber(topic.articleCount)}
          />
          <Stat label="This week" value={compactNumber(about.weeklyStories)} />
        </dl>
      </Card>

      {channels.length > 0 && (
        <Card className="py-3">
          <SectionLabel className="px-4 pb-1">Channels</SectionLabel>
          <ul role="list">
            {channels.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2">
                <Link
                  to="/channels/$channelId"
                  params={{ channelId: item.id }}
                  className="group flex min-w-0 flex-1 items-center gap-3"
                >
                  <ChannelIcon channel={item} size={30} />
                  <span className="min-w-0">
                    <span className="block truncate text-subhead font-semibold text-label group-hover:text-brand-text">
                      {item.name}
                    </span>
                    <span className="block text-caption-1 text-label-tertiary tabular">
                      {memberLabel(item.memberCount)}
                    </span>
                  </span>
                </Link>
                <JoinButton channel={item} size="xs" />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {about.related.length > 0 && (
        <Card className="p-4">
          <SectionLabel className="px-0 pb-3">Related topics</SectionLabel>
          <TopicChips topics={about.related} />
          <Link
            to="/topics"
            className="mt-3 inline-block text-footnote font-semibold text-brand-text hover:underline"
          >
            All topics
          </Link>
        </Card>
      )}

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

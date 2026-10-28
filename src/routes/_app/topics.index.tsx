import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Hash, Search, X } from 'lucide-react'
import { configQuery, topicDirectoryQuery } from '@/lib/queries'
import { breadcrumbs, collectionPage, seo } from '@/lib/seo'
import { FeedHeader } from '@/components/feed/feed-view'
import { SiteFooter } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Card, SectionLabel } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/misc'
import { TopicChips } from '@/components/topics/topic-parts'

const DESCRIPTION =
  'Browse the topics people read about on Refetch, from AI and open source to Rust, security and space. Every topic has its own feed of stories and discussions.'

export const Route = createFileRoute('/_app/topics/')({
  loader: async ({ context }) => {
    const [directory, config] = await Promise.all([
      context.queryClient.ensureQueryData(topicDirectoryQuery()),
      context.queryClient.ensureQueryData(configQuery()),
    ])
    return {
      siteUrl: config.siteUrl,
      topics: directory.topics.slice(0, 100).map((topic) => ({ key: topic.key, label: topic.label })),
    }
  },
  head: ({ loaderData }) => {
    const siteUrl = loaderData?.siteUrl ?? 'https://refetch.io'
    const url = `${siteUrl}/topics`
    return {
      meta: seo({
        title: 'Tech topics: news and discussions by subject | Refetch',
        description: DESCRIPTION,
        url,
      }),
      links: [{ rel: 'canonical', href: url }],
      scripts: [
        collectionPage({
          siteUrl,
          url,
          name: 'Topics on Refetch',
          description: DESCRIPTION,
          items: (loaderData?.topics ?? []).map((topic) => ({
            name: topic.label,
            url: `${siteUrl}/topics/${topic.key}`,
          })),
        }),
        breadcrumbs([
          { name: 'Refetch', url: `${siteUrl}/` },
          { name: 'Topics', url },
        ]),
      ],
    }
  },
  component: TopicsPage,
})

function TopicsPage() {
  const { data } = useSuspenseQuery(topicDirectoryQuery())
  const [query, setQuery] = React.useState('')
  const term = query.trim().toLowerCase()
  const results = term ? data.topics.filter((topic) => topic.label.toLowerCase().includes(term)) : data.topics

  return (
    <div className="mx-auto max-w-5xl">
      <FeedHeader
        title="Topics"
        description="Every story on Refetch is tagged with the topics it covers. Pick one to see its stories."
      />

      {data.topics.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Hash />}
            title="Topics are on their way"
            description="Topics are counted once a day. Check back shortly, or browse channels in the meantime."
            action={
              <Button asChild variant="primary" size="md">
                <Link to="/channels">Browse channels</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {data.trending.length > 0 && !term && (
            <section aria-labelledby="topics-trending">
              <SectionLabel id="topics-trending" className="mb-3">
                Trending today
              </SectionLabel>
              <Card className="p-4">
                <TopicChips topics={data.trending} showCounts />
              </Card>
            </section>
          )}

          <section aria-labelledby="topics-popular">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SectionLabel id="topics-popular">Popular topics</SectionLabel>
              <div className="relative sm:w-72">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-label-tertiary"
                  strokeWidth={2.2}
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setQuery('')
                  }}
                  placeholder="Search topics"
                  aria-label="Search topics"
                  className="h-10 pr-9 pl-10 [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-2.5 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-label-tertiary/40 text-surface hover:bg-label-tertiary/60"
                  >
                    <X className="size-3" strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>
            <Card className="p-4">
              {results.length > 0 ? (
                <TopicChips topics={results} label="Popular topics" showCounts />
              ) : (
                <EmptyState
                  icon={<Search />}
                  title="No matching topics"
                  description={`Nothing matches “${query.trim()}” among the popular topics.`}
                />
              )}
            </Card>
          </section>
        </div>
      )}

      <SiteFooter variant="page" className="mt-16 lg:hidden" />
    </div>
  )
}

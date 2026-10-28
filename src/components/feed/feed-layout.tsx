import * as React from 'react'
import { z } from 'zod'
import { FEED_MAX_PAGES } from '@/lib/constants'
import { SiteFooter } from '../layout/footer'
import { InsightsRail } from '../insights/insights-rail'
import { FeedPagination, FeedSkeleton } from './feed-view'
import { FeedColumn, FeedTabs } from './feed-column'

/** `?page=2` … `?page=10`; anything else falls back to the first page. */
export const feedSearchSchema = z.object({
  page: z.number().int().min(2).max(FEED_MAX_PAGES).optional().catch(undefined),
})

export function FeedLayout({
  header,
  column,
  feed,
  rail,
  railLabel = 'More',
  children,
}: {
  header?: React.ReactNode
  /** Sticky header of a single feed column (tabs or a column title); the list joins it. */
  column?: React.ReactNode
  /** The column's feed page; its pagination goes below the card rather than inside it. */
  feed?: { posts: ReadonlyArray<unknown>; page: number; hasMore: boolean } | null
  /** Replaces the default insights rail (e.g. a channel's own sidebar). */
  rail?: React.ReactNode
  /** Accessible name for a custom rail. */
  railLabel?: string
  children: React.ReactNode
}) {
  // Header, sidebar and rail all start on the same top line.
  return (
    <div>
      <div className="flex gap-8">
        <div className="min-w-0 flex-1">
          {column ? (
            <FeedColumnSection column={column} feed={feed}>
              {children}
            </FeedColumnSection>
          ) : (
            <>
              {header}
              {children}
            </>
          )}
          <SiteFooter variant="page" className="mt-16 lg:hidden" />
        </div>
        {rail ? (
          <aside
            aria-label={railLabel}
            className="sticky top-[76px] hidden w-[300px] shrink-0 space-y-4 self-start xl:block"
          >
            {rail}
          </aside>
        ) : (
          <InsightsRail />
        )}
      </div>
    </div>
  )
}

/** A feed column with its pagination below the card; for pages that frame it themselves. */
export function FeedColumnSection({
  column,
  feed,
  children,
}: {
  column: React.ReactNode
  feed?: { posts: ReadonlyArray<unknown>; page: number; hasMore: boolean } | null
  children: React.ReactNode
}) {
  return (
    <>
      <FeedColumn header={column}>{children}</FeedColumn>
      {feed && feed.posts.length > 0 && <FeedPagination page={feed.page} hasMore={feed.hasMore} />}
    </>
  )
}

/** Loading state for the main feeds: tabs plus a skeleton list. */
export function FeedPending({ title, ranked }: { title: string; ranked?: boolean }) {
  return (
    <FeedLayout column={<FeedTabs title={title} />}>
      <FeedSkeleton ranked={ranked} />
    </FeedLayout>
  )
}

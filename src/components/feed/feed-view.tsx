import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import type { FeedPage } from '@/lib/types'
import { FEED_PAGE_SIZE } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { List, ListItem } from '../ui/card'
import { EmptyState, Skeleton } from '../ui/misc'
import { PostRow } from './post-row'
import { useInColumn } from './feed-column'

interface FeedHeaderProps {
  title: string
  description: string
  actions?: React.ReactNode
}

/** Plain page title for non-feed pages (the feeds use FeedTabs in a column). */
export function FeedHeader({ title, description, actions }: FeedHeaderProps) {
  return (
    <header className="mb-4 flex items-end justify-between gap-4 px-1">
      <div className="min-w-0">
        <h1 className="text-title-2 text-label">{title}</h1>
        <p className="mt-0.5 text-subhead text-pretty text-label-secondary">{description}</p>
      </div>
      {actions}
    </header>
  )
}

interface FeedListProps {
  page: FeedPage
  ranked?: boolean
  hideChannel?: boolean
  empty: { title: string; description: React.ReactNode; action?: React.ReactNode }
}

/** Inside a FeedColumn the column is the card; lists render flat. */
const BARE = 'rounded-none bg-transparent shadow-none'

export function FeedList({ page, ranked, hideChannel, empty }: FeedListProps) {
  const inColumn = useInColumn()
  if (page.posts.length === 0) {
    return (
      <div className={inColumn ? undefined : 'rounded-card bg-surface shadow-card'}>
        <EmptyState icon={<Inbox />} {...empty} />
      </div>
    )
  }

  const offset = (page.page - 1) * FEED_PAGE_SIZE
  return (
    <>
      <List
        className={cn(inColumn && BARE)}
        style={{ '--list-inset': ranked ? '5rem' : '3rem' } as React.CSSProperties}
      >
        {page.posts.map((post, index) => (
          <PostRow
            key={post.id}
            post={post}
            rank={ranked ? offset + index + 1 : undefined}
            hideChannel={hideChannel}
          />
        ))}
      </List>
      <FeedPagination page={page.page} hasMore={page.hasMore} />
    </>
  )
}

export function FeedPagination({ page, hasMore }: { page: number; hasMore: boolean }) {
  const inColumn = useInColumn()
  return (
    <div className={cn('text-center', inColumn ? 'border-t border-separator px-4 pt-10 pb-8' : 'mt-12')}>
      <FeedEndArt done={!hasMore} className="mx-auto h-[104px] w-[208px]" />
      <p className="mt-3 text-headline text-label">
        {hasMore ? 'You’ve reached the end of this page' : 'That’s everything for now'}
      </p>
      <p className="mt-1 text-subhead text-label-secondary">
        {hasMore ? 'Go touch some grass, or keep going.' : 'Fresh stories land all day. Check back soon.'}
      </p>
      {(page > 1 || hasMore) && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-center gap-3">
          {page > 1 ? (
            <Button asChild variant="secondary" size="md">
              <Link
                to="."
                search={(prev: Record<string, unknown>) => ({
                  ...prev,
                  page: page - 1 === 1 ? undefined : page - 1,
                })}
                resetScroll
              >
                <ChevronLeft strokeWidth={2.5} />
                Previous
              </Link>
            </Button>
          ) : (
            <Button variant="secondary" size="md" disabled>
              <ChevronLeft strokeWidth={2.5} />
              Previous
            </Button>
          )}
          <span className="min-w-16 font-rounded text-footnote font-semibold text-label-tertiary tabular">
            Page {page}
          </span>
          {hasMore ? (
            <Button asChild variant="secondary" size="md">
              <Link
                to="."
                search={(prev: Record<string, unknown>) => ({ ...prev, page: page + 1 })}
                resetScroll
              >
                Next
                <ChevronRight strokeWidth={2.5} />
              </Link>
            </Button>
          ) : (
            <Button variant="secondary" size="md" disabled>
              Next
              <ChevronRight strokeWidth={2.5} />
            </Button>
          )}
        </nav>
      )}
    </div>
  )
}

export function FeedSkeleton({ rows = 10, ranked }: { rows?: number; ranked?: boolean }) {
  const inColumn = useInColumn()
  return (
    <List
      className={cn(inColumn && BARE)}
      aria-busy="true"
      aria-label="Loading stories"
      style={{ '--list-inset': ranked ? '5rem' : '3rem' } as React.CSSProperties}
    >
      {Array.from({ length: rows }, (_, i) => (
        <ListItem key={i} className="flex items-start gap-2 py-3 pr-4 pl-2">
          {ranked && <span className="w-6 shrink-0" />}
          <div className="flex w-8 flex-col items-center gap-1.5 pt-1">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-3 w-4" />
            <Skeleton className="size-5 rounded-full" />
          </div>
          <div className="flex-1 space-y-2.5 pt-1">
            <Skeleton className="h-4 rounded-full" style={{ width: `${62 + ((i * 17) % 30)}%` }} />
            <Skeleton className="h-3 w-48 rounded-full" />
          </div>
          <Skeleton className="mt-0.5 h-7 w-12 rounded-full" />
        </ListItem>
      ))}
    </List>
  )
}

/** A small meadow: a sprout, a sun, and a signpost pointing on (or a flag when you're done). */
function FeedEndArt({ done, className }: { done: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 208 104" className={className} aria-hidden fill="none">
      <defs>
        <linearGradient id="feed-end-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--brand)" stopOpacity="0.1" />
          <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="20" y="4" width="168" height="84" rx="42" fill="url(#feed-end-sky)" />
      {/* Sun */}
      <circle cx="160" cy="26" r="11" fill="#ffcc00" />
      <circle cx="160" cy="26" r="17" fill="#ffcc00" opacity="0.18" />
      {/* Clouds */}
      <rect x="34" y="20" width="38" height="12" rx="6" fill="var(--fill)" />
      <rect x="44" y="13" width="20" height="14" rx="7" fill="var(--fill)" />
      <rect x="120" y="44" width="26" height="9" rx="4.5" fill="var(--fill)" />
      {/* Ground */}
      <ellipse cx="104" cy="92" rx="88" ry="11" fill="#34c759" opacity="0.18" />
      <path
        d="M22 92c22-7 52-10 82-10s60 3 82 10"
        stroke="#34c759"
        strokeOpacity="0.45"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Grass */}
      {[30, 42, 58, 140, 152, 170, 182].map((x, i) => (
        <path
          key={x}
          d={`M${x} 90c${i % 2 ? 2 : -2}-5 ${i % 2 ? 1 : -1}-9 ${i % 2 ? 4 : -4}-13M${x + 4} 90c0-4 2-7 5-9`}
          stroke="#34c759"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
      {/* Sprout */}
      <path d="M100 88V64" stroke="#2fb350" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 72c-3-10-12-14-21-12 2 9 10 14 21 12Z" fill="#34c759" />
      <path d="M100 66c3-11 13-16 23-13-2 10-11 15-23 13Z" fill="#30d158" />
      {done ? (
        /* Finish flag */
        <g>
          <path d="M136 88V50" stroke="var(--label-tertiary)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M137 51h20l-5 7 5 7h-20Z" fill="var(--brand)" />
        </g>
      ) : (
        /* Signpost pointing down to the next page */
        <g>
          <path d="M140 88V56" stroke="var(--label-tertiary)" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="124" y="46" width="32" height="14" rx="4" fill="var(--brand)" />
          <path
            d="M136 50.5v5m0 0-2.5-2.5m2.5 2.5 2.5-2.5M144 50.5h4"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  )
}

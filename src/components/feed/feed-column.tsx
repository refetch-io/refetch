import * as React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

/**
 * A feed column (Twitter style): one surface, with a sticky frosted header
 * and the list directly beneath it. Lists inside drop their own card chrome.
 */
const ColumnContext = React.createContext(false)

export function useInColumn() {
  return React.useContext(ColumnContext)
}

export function FeedColumn({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  return (
    <ColumnContext.Provider value={true}>
      <section className="rounded-card bg-surface shadow-card">
        {header}
        {children}
      </section>
    </ColumnContext.Provider>
  )
}

/**
 * Sticky header of a column. It stays where it rests below the app header
 * instead of sliding up to meet it: a strip of page background fills the gap
 * above it and two corner pieces keep its rounded corners clear of the list
 * scrolling underneath. The corner pieces reach past the column's edges to
 * also hide its outline ring as it scrolls by, and overlap the strip by a
 * pixel so no seam opens between them. A last piece redraws that outline
 * around the rounded top, where the column's own sides leave off. The offsets
 * match the top padding of `main`.
 */
function StickyColumnHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="sticky top-[72px] z-20 sm:top-[80px] lg:top-[76px]">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-2 bottom-full h-5 bg-bg sm:h-7 lg:h-6"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-px -left-2 h-[calc(var(--radius-card)+1px)] w-[calc(var(--radius-card)+0.5rem)] bg-[radial-gradient(circle_at_100%_100%,transparent_calc(var(--radius-card)-0.5px),var(--bg)_var(--radius-card))]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-px -right-2 h-[calc(var(--radius-card)+1px)] w-[calc(var(--radius-card)+0.5rem)] bg-[radial-gradient(circle_at_0_100%,transparent_calc(var(--radius-card)-0.5px),var(--bg)_var(--radius-card))]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-(--radius-card) rounded-t-card shadow-card [clip-path:inset(-0.5rem_-0.5rem_0_-0.5rem)]"
      />
      <div className={cn('rounded-t-card border-b border-separator glass', className)}>{children}</div>
    </div>
  )
}

const FEED_TABS = [
  { to: '/', label: 'Top' },
  { to: '/new', label: 'New' },
  { to: '/show', label: 'Show' },
  { to: '/following', label: 'Following', requiresAuth: true },
] as const

/** Sticky underline tabs switching between the main feeds. */
export function FeedTabs({ title }: { title: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { user } = useSession()
  return (
    <StickyColumnHeader>
      {/* The visible tabs name the page; keep a real heading for assistive tech. */}
      <h1 className="sr-only">{title}</h1>
      <nav aria-label="Feeds" className="flex">
        {FEED_TABS.map((tab) => {
          const active = pathname === tab.to
          const target =
            'requiresAuth' in tab && !user
              ? ({ to: '/signin', search: { redirect: tab.to } } as const)
              : ({ to: tab.to } as const)
          return (
            <Link
              key={tab.to}
              {...target}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-[52px] flex-1 items-center justify-center text-subhead transition-colors first:rounded-tl-card last:rounded-tr-card hover:bg-fill-secondary/70',
                active ? 'font-bold text-label' : 'font-medium text-label-secondary hover:text-label',
              )}
            >
              {tab.label}
              {active && <span aria-hidden className="absolute inset-x-0 -bottom-px h-[3px] bg-brand" />}
            </Link>
          )
        })}
      </nav>
    </StickyColumnHeader>
  )
}

/** Sticky column title for non-feed pages ("Your posts · 12 stories"). */
export function ColumnTitle({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <StickyColumnHeader className="flex min-h-[52px] items-center gap-3 px-4 py-2 sm:px-5">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-headline text-label">{title}</h1>
        {subtitle && <p className="truncate text-caption-1 text-label-secondary">{subtitle}</p>}
      </div>
      {actions}
    </StickyColumnHeader>
  )
}

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
    <div className="sticky top-[52px] z-20 rounded-t-card border-b border-separator glass">
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
    </div>
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
    <div className="sticky top-[52px] z-20 flex min-h-[52px] items-center gap-3 rounded-t-card border-b border-separator glass px-4 py-2 sm:px-5">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-headline text-label">{title}</h1>
        {subtitle && <p className="truncate text-caption-1 text-label-secondary">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

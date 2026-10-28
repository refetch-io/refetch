import * as React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Hash, Search } from 'lucide-react'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'
import { ChannelIcon, useChannels } from '../channels/channel-parts'
import { useCommandCenter } from '../command-center'
import { SiteFooter } from './footer'
import { NAV_ITEMS, TAB_ITEMS, type NavItem } from './nav'
import { UnreadBadge, useUnreadCount } from '../messages/parts'

function useActivePath() {
  return useRouterState({ select: (state) => state.location.pathname })
}

function useNavTarget(item: NavItem) {
  const { user } = useSession()
  // Signed-out visitors go through sign-in and land on the page they wanted.
  return item.requiresAuth && !user
    ? ({ to: '/signin', search: { redirect: item.to } } as const)
    : ({ to: item.to } as const)
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const target = useNavTarget(item)
  return (
    <Link
      {...target}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex h-10 pressable items-center gap-3 rounded-[11px] px-3 text-subhead font-medium',
        active
          ? 'bg-surface text-label shadow-card'
          : 'text-label-secondary hover:bg-fill-secondary hover:text-label',
      )}
    >
      <item.icon
        className={cn(
          'size-[18px] shrink-0',
          active ? 'text-brand-text' : 'text-label-tertiary group-hover:text-label-secondary',
        )}
        strokeWidth={2.1}
      />
      <span className="flex-1">{item.label}</span>
      {item.to === '/messages' && <MessagesBadge />}
    </Link>
  )
}

function MessagesBadge({ className }: { className?: string }) {
  return <UnreadBadge count={useUnreadCount()} className={className} />
}

/** Joined channels (or popular ones, for newcomers) under the main navigation. */
function SidebarChannels({ pathname }: { pathname: string }) {
  const { channels, joined, ready } = useChannels()
  if (!ready) return null
  const mine = channels.filter((channel) => joined.has(channel.id))
  const list =
    mine.length > 0 ? mine : [...channels].sort((a, b) => b.memberCount - a.memberCount).slice(0, 6)

  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 pb-1.5">
        <h2 className="text-caption-1 font-semibold tracking-[0.06em] text-label-tertiary uppercase">
          {mine.length > 0 ? 'Your channels' : list.length > 0 ? 'Popular channels' : 'Channels'}
        </h2>
      </div>
      <nav aria-label="Channels" className="-mr-2 min-h-0 space-y-0.5 overflow-y-auto pr-2">
        {list.map((channel) => {
          const active = pathname === `/channels/${channel.id}`
          return (
            <Link
              key={channel.id}
              to="/channels/$channelId"
              params={{ channelId: channel.id }}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-9 pressable items-center gap-2.5 rounded-[10px] px-2.5 text-subhead',
                active
                  ? 'bg-surface font-semibold text-label shadow-card'
                  : 'text-label-secondary hover:bg-fill-secondary hover:text-label',
              )}
            >
              <ChannelIcon channel={channel} size={22} />
              <span className="truncate">{channel.name}</span>
            </Link>
          )
        })}
        <Link
          to="/channels"
          aria-current={pathname === '/channels' ? 'page' : undefined}
          className={cn(
            'flex h-9 pressable items-center gap-2.5 rounded-[10px] px-2.5 text-subhead',
            pathname === '/channels'
              ? 'bg-surface font-semibold text-label shadow-card'
              : 'text-label-secondary hover:bg-fill-secondary hover:text-label',
          )}
        >
          <span className="grid size-[22px] place-items-center rounded-[6px] bg-fill text-label-secondary">
            <Hash className="size-3.5" strokeWidth={2.4} />
          </span>
          All channels
        </Link>
      </nav>
    </div>
  )
}

/** Desktop sidebar (macOS source-list style) with the footer pinned below. */
export function Sidebar() {
  const pathname = useActivePath()
  const { user } = useSession()
  return (
    <aside className="sticky top-[52px] hidden h-[calc(100dvh-52px)] w-[208px] shrink-0 flex-col py-6 lg:flex">
      <nav aria-label="Primary" className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} item={item} active={item.isActive(pathname, user?.id ?? null)} />
        ))}
      </nav>
      <SidebarChannels pathname={pathname} />
      <div className="mt-6 shrink-0 pr-2">
        <SiteFooter />
      </div>
    </aside>
  )
}

function TabLink({ item, active, compact }: { item: NavItem; active: boolean; compact: boolean }) {
  const target = useNavTarget(item)
  return (
    <Link
      {...target}
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      className={cn(
        'relative z-10 flex flex-1 flex-col items-center justify-center rounded-full transition-colors duration-300',
        active ? 'text-brand-text' : 'text-label active:text-label-secondary',
      )}
    >
      <span className="relative">
        <item.icon
          aria-hidden
          className={cn('transition-all duration-500 ease-spring', compact ? 'size-[22px]' : 'size-6')}
          strokeWidth={active ? 2.3 : 1.9}
        />
        {item.to === '/messages' && <MessagesBadge className="absolute -top-1.5 -right-2.5" />}
      </span>
      <span
        aria-hidden
        className={cn(
          'overflow-hidden text-[10px] leading-3 font-semibold tracking-[0.01em] transition-all duration-500 ease-spring',
          compact ? 'max-h-0 opacity-0' : 'mt-0.5 max-h-3 opacity-100',
        )}
      >
        {item.label}
      </span>
    </Link>
  )
}

/** Collapses the tab bar while reading (scrolling down), like iOS 26. */
function useScrollCompact(resetKey: string) {
  const [compact, setCompact] = React.useState(false)

  React.useEffect(() => setCompact(false), [resetKey])

  React.useEffect(() => {
    let last = window.scrollY
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        const delta = y - last
        if (y < 80) setCompact(false)
        else if (delta > 8) setCompact(true)
        else if (delta < -8) setCompact(false)
        if (Math.abs(delta) > 8 || y < 80) last = y
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return compact
}

/**
 * Floating Liquid Glass tab bar for phones and tablets: a capsule of tabs with
 * a sliding selection, plus a separate round Search button (as in iOS 26).
 */
export function TabBar() {
  const pathname = useActivePath()
  const compact = useScrollCompact(pathname)
  const { open } = useCommandCenter()
  const { user } = useSession()
  const activeIndex = TAB_ITEMS.findIndex((item) => item.isActive(pathname, user?.id ?? null))

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-end justify-center gap-2.5 px-4 pb-[max(14px,env(safe-area-inset-bottom))] lg:hidden">
      <nav
        aria-label="Primary"
        className={cn(
          'liquid-glass pointer-events-auto relative flex w-full max-w-[340px] rounded-full p-1 transition-[height,max-width] duration-500 ease-spring',
          compact ? 'h-[52px] max-w-[280px]' : 'h-[62px]',
        )}
      >
        {activeIndex >= 0 && (
          <span
            aria-hidden
            className="absolute inset-y-1 left-1 rounded-full bg-(--lg-selected) transition-transform duration-500 ease-spring"
            style={{
              width: `calc((100% - 0.5rem) / ${TAB_ITEMS.length})`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />
        )}
        {TAB_ITEMS.map((item, index) => (
          <TabLink key={item.to} item={item} active={index === activeIndex} compact={compact} />
        ))}
      </nav>
      <button
        type="button"
        onClick={open}
        aria-label="Search"
        className={cn(
          'liquid-glass pointer-events-auto relative grid shrink-0 pressable place-items-center rounded-full text-label transition-[width,height] duration-500 ease-spring',
          compact ? 'size-[52px]' : 'size-[62px]',
        )}
      >
        <Search className="size-[22px]" strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  )
}

/** Slim activity bar shown while a navigation is loading. */
export function NavigationProgress() {
  const loading = useRouterState({ select: (state) => state.status === 'pending' })
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2.5px] overflow-hidden transition-opacity duration-300',
        loading ? 'opacity-100 delay-150' : 'opacity-0',
      )}
    >
      <div className="h-full w-full origin-left animate-progress brand-gradient" />
    </div>
  )
}

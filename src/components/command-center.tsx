import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Command } from 'cmdk'
import { Dialog } from 'radix-ui'
import {
  ArrowRight,
  CircleUserRound,
  Clock3,
  CornerDownLeft,
  FileText,
  Hash,
  MessageCircle,
  MessagesSquare,
  Monitor,
  Moon,
  PenLine,
  Rss,
  Search,
  Sun,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { searchQuery } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { useTheme, type ThemePreference } from '@/lib/theme'
import { cn, timeAgo } from '@/lib/utils'
import { ChannelIcon, useChannels } from './channels/channel-parts'
import { Kbd } from './ui/misc'
import { Spinner } from './ui/spinner'

const CommandCenterContext = React.createContext<{ open: () => void }>({ open: () => {} })

export function useCommandCenter() {
  return React.useContext(CommandCenterContext)
}

/** ⌘ on Apple platforms, Ctrl elsewhere (resolved after hydration). */
export function useModKey() {
  const [mod, setMod] = React.useState('⌘')
  React.useEffect(() => {
    if (!/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)) setMod('Ctrl')
  }, [])
  return mod
}

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)))
}

export function CommandCenterProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      } else if (event.key === '/' && !isTypingTarget(event.target)) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = React.useMemo(() => ({ open: () => setOpen(true) }), [])

  return (
    <CommandCenterContext.Provider value={value}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen} />
    </CommandCenterContext.Provider>
  )
}

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

interface PageItem {
  label: string
  to: '/' | '/new' | '/show' | '/following' | '/channels' | '/mines' | '/submit' | '/messages'
  icon: LucideIcon
  keywords: string
  requiresAuth?: boolean
}

const PAGES: Array<PageItem> = [
  { label: 'Top stories', to: '/', icon: TrendingUp, keywords: 'home front page best' },
  { label: 'Newest', to: '/new', icon: Clock3, keywords: 'latest recent' },
  { label: 'Show Refetch', to: '/show', icon: Monitor, keywords: 'launches projects show rf' },
  {
    label: 'Following',
    to: '/following',
    icon: Rss,
    keywords: 'my channels feed joined',
    requiresAuth: true,
  },
  { label: 'All channels', to: '/channels', icon: Hash, keywords: 'topics communities browse join' },
  {
    label: 'Messages',
    to: '/messages',
    icon: MessagesSquare,
    keywords: 'dm direct inbox chat group conversation',
    requiresAuth: true,
  },
  {
    label: 'Your posts',
    to: '/mines',
    icon: CircleUserRound,
    keywords: 'mine my submissions',
    requiresAuth: true,
  },
  { label: 'Submit a story', to: '/submit', icon: PenLine, keywords: 'post share link new' },
]

const THEMES: Array<{ value: ThemePreference; label: string; icon: LucideIcon }> = [
  { value: 'light', label: 'Light appearance', icon: Sun },
  { value: 'dark', label: 'Dark appearance', icon: Moon },
  { value: 'system', label: 'Match system appearance', icon: Monitor },
]

const itemClass = cn(
  'flex h-11 cursor-default items-center gap-3 rounded-[11px] px-3 text-subhead text-label outline-none select-none',
  'data-[selected=true]:bg-brand data-[selected=true]:text-on-brand',
  '[&_[data-muted]]:text-label-tertiary data-[selected=true]:[&_[data-muted]]:text-on-brand/75',
)

const groupClass = cn(
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5',
  '[&_[cmdk-group-heading]]:text-caption-1 [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-label-tertiary',
)

function ItemIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-fill text-label-secondary in-data-[selected=true]:bg-white/20 in-data-[selected=true]:text-on-brand">
      <Icon className="size-4" strokeWidth={2.1} />
    </span>
  )
}

function CommandDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = React.useState('')
  const debounced = useDebounced(query.trim(), 180)
  const search = useQuery(searchQuery(debounced))
  const { channels, joined } = useChannels()
  const { user } = useSession()
  const { setPreference } = useTheme()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const run = (action: () => void) => {
    onOpenChange(false)
    action()
  }

  const term = query.trim().toLowerCase()
  const matches = (text: string) => !term || text.toLowerCase().includes(term)
  const pages = PAGES.filter((page) => matches(`${page.label} ${page.keywords}`))
  const channelMatches = channels
    .filter((channel) => matches(`${channel.name} ${channel.category} ${channel.keywords.join(' ')}`))
    .sort((a, b) => Number(joined.has(b.id)) - Number(joined.has(a.id)))
    .slice(0, term ? 6 : 5)
  const themes = THEMES.filter((theme) => matches(`${theme.label} theme mode`))
  const stories = debounced.length >= 2 ? (search.data ?? []) : []
  const searching = debounced.length >= 2 && search.isFetching

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-black/25 backdrop-blur-[2px] dark:bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-[10vh] left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[640px] -translate-x-1/2 animate-scale-in overflow-hidden rounded-[22px] glass-strong shadow-popover"
        >
          <Dialog.Title className="sr-only">Search Refetch</Dialog.Title>
          <Command shouldFilter={false} loop label="Search Refetch">
            <div className="flex items-center gap-3 border-b border-separator px-4">
              <Search className="size-5 shrink-0 text-label-tertiary" strokeWidth={2.2} aria-hidden />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search stories, channels and pages…"
                className="h-14 min-w-0 flex-1 bg-transparent text-callout text-label outline-none placeholder:text-label-tertiary"
              />
              {searching ? (
                <Spinner className="size-4 text-label-tertiary" />
              ) : (
                <Kbd className="max-sm:hidden">esc</Kbd>
              )}
            </div>

            <Command.List className="max-h-[min(60vh,460px)] scroll-py-2 overflow-y-auto overscroll-contain p-2">
              <Command.Empty className="px-4 py-10 text-center text-subhead text-label-secondary">
                {searching ? 'Searching…' : `No results for “${query.trim()}”.`}
              </Command.Empty>

              {stories.length > 0 && (
                <Command.Group heading="Stories" className={groupClass}>
                  {stories.map((story) => (
                    <Command.Item
                      key={story.id}
                      value={`story-${story.id}`}
                      onSelect={() =>
                        run(() => navigate({ to: '/threads/$threadId', params: { threadId: story.id } }))
                      }
                      className={cn(itemClass, 'h-auto min-h-11 py-2')}
                    >
                      <ItemIcon icon={FileText} />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 font-medium">{story.title}</span>
                        <span data-muted className="mt-0.5 flex items-center gap-1.5 text-caption-1">
                          {story.domain ?? 'refetch.io'} · {timeAgo(story.createdAt)}
                          <MessageCircle className="ml-1 size-3" aria-hidden /> {story.countComments}
                        </span>
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {channelMatches.length > 0 && (
                <Command.Group heading="Channels" className={groupClass}>
                  {channelMatches.map((channel) => (
                    <Command.Item
                      key={channel.id}
                      value={`channel-${channel.id}`}
                      onSelect={() =>
                        run(() => navigate({ to: '/c/$channelId', params: { channelId: channel.id } }))
                      }
                      className={itemClass}
                    >
                      <ChannelIcon channel={channel} size={28} />
                      <span className="flex-1 truncate">{channel.name}</span>
                      <span data-muted className="text-caption-1">
                        {joined.has(channel.id) ? 'Joined' : channel.category}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {pages.length > 0 && (
                <Command.Group heading="Go to" className={groupClass}>
                  {pages.map((page) => (
                    <Command.Item
                      key={page.to}
                      value={`page-${page.to}`}
                      onSelect={() =>
                        run(() =>
                          page.requiresAuth && !user
                            ? navigate({ to: '/signin', search: { redirect: page.to } })
                            : navigate({ to: page.to }),
                        )
                      }
                      className={itemClass}
                    >
                      <ItemIcon icon={page.icon} />
                      <span className="flex-1">{page.label}</span>
                      <ArrowRight data-muted className="size-4" aria-hidden />
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {themes.length > 0 && (
                <Command.Group heading="Appearance" className={groupClass}>
                  {themes.map((theme) => (
                    <Command.Item
                      key={theme.value}
                      value={`theme-${theme.value}`}
                      onSelect={() => run(() => setPreference(theme.value))}
                      className={itemClass}
                    >
                      <ItemIcon icon={theme.icon} />
                      <span className="flex-1">{theme.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>

            <div className="flex items-center gap-4 border-t border-separator px-4 py-2.5 text-caption-1 text-label-tertiary max-sm:hidden">
              <span className="inline-flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
                to navigate
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd>
                  <CornerDownLeft className="size-3" />
                </Kbd>
                to open
              </span>
              <span className="ml-auto">Stories match on title</span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

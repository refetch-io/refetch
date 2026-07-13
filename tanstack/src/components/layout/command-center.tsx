import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowUp,
  Clock,
  CornerDownLeft,
  FileText,
  LogIn,
  Monitor,
  Plus,
  Search,
  Settings2,
  TrendingUp,
  User,
  type LucideIcon,
} from 'lucide-react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandIcon,
  CommandInput,
  CommandItem,
  CommandKbd,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useAuth } from '@/contexts/auth-context'
import { useModKeyLabel } from '@/hooks/use-mod-key'
import { api } from '@/lib/api/client'
import type { Post } from '@/lib/types'
import { reportPresenceActivity, clearPresenceActivity } from '@/lib/presence'
import { cn } from '@/lib/utils'

const MIN_SEARCH_CHARS = 3
const SEARCH_DEBOUNCE_MS = 300

function ItemLabel({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="truncate font-medium text-foreground">{title}</span>
      <span className="truncate text-xs text-muted-foreground">
        {description}
      </span>
    </div>
  )
}

type CommandNavItem = {
  id: string
  title: string
  description: string
  keywords: string
  icon: LucideIcon
  auth?: 'required' | 'guest'
  run: () => void
}

function matchesQuery(haystack: string, query: string) {
  if (!query) return true
  return haystack.toLowerCase().includes(query.toLowerCase())
}

export function CommandCenter({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [searchError, setSearchError] = useState('')
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const modKey = useModKeyLabel()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) {
        return
      }
      event.preventDefault()
      setOpen((current) => !current)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setPosts([])
      setSearchError('')
      setLoadingPosts(false)
      clearPresenceActivity()
      return
    }
    reportPresenceActivity('Searching')
  }, [open])

  useEffect(() => {
    if (!open) return

    const q = query.trim()
    if (q.length < MIN_SEARCH_CHARS) {
      setPosts([])
      setSearchError('')
      setLoadingPosts(false)
      return
    }

    let cancelled = false
    setLoadingPosts(true)
    setSearchError('')

    const timer = window.setTimeout(async () => {
      try {
        const result = await api.searchPosts({ q, limit: 20 })
        if (cancelled) return
        setPosts(result.data)
        setSearchError('')
      } catch (error) {
        if (cancelled) return
        setSearchError(
          error instanceof Error ? error.message : 'Search failed',
        )
      } finally {
        if (!cancelled) setLoadingPosts(false)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, query])

  const run = (action: () => void) => {
    setOpen(false)
    action()
  }

  const trimmed = query.trim()
  const searching = trimmed.length >= MIN_SEARCH_CHARS

  const navItems = useMemo<CommandNavItem[]>(() => {
    const items: CommandNavItem[] = [
      {
        id: 'top',
        title: 'Top',
        description: 'Highest-ranked stories from the last 24 hours',
        keywords: 'navigate top home feed',
        icon: TrendingUp,
        run: () => navigate({ to: '/' }),
      },
      {
        id: 'show',
        title: 'Show',
        description: 'Projects and launches from the community',
        keywords: 'navigate show',
        icon: Monitor,
        run: () => navigate({ to: '/show' }),
      },
      {
        id: 'new',
        title: 'New',
        description: 'Latest submissions as they come in',
        keywords: 'navigate new',
        icon: Clock,
        run: () => navigate({ to: '/new' }),
      },
      {
        id: 'mines',
        title: 'My posts',
        description: 'Stories you’ve submitted',
        keywords: 'navigate my posts mines',
        icon: User,
        auth: 'required',
        run: () => navigate({ to: '/mines' }),
      },
      {
        id: 'account',
        title: 'Account',
        description: 'Profile, email, and security settings',
        keywords: 'navigate account settings',
        icon: Settings2,
        auth: 'required',
        run: () => navigate({ to: '/account' }),
      },
      {
        id: 'signin',
        title: 'Sign in',
        description: 'Join the discussion and vote',
        keywords: 'navigate sign in',
        icon: LogIn,
        auth: 'guest',
        run: () => navigate({ to: '/signin' }),
      },
      {
        id: 'submit',
        title: 'Submit story',
        description: 'Share a link or Show RF with the community',
        keywords: 'action submit story create',
        icon: Plus,
        run: () =>
          navigate({ to: isAuthenticated ? '/submit' : '/signin' }),
      },
    ]

    return items.filter((item) => {
      if (item.auth === 'required' && !isAuthenticated) return false
      if (item.auth === 'guest' && isAuthenticated) return false
      return matchesQuery(
        `${item.title} ${item.description} ${item.keywords}`,
        trimmed,
      )
    })
  }, [isAuthenticated, navigate, trimmed])

  const navigationItems = navItems.filter((item) => item.id !== 'submit')
  const createItems = navItems.filter((item) => item.id === 'submit')

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className={cn(
          'group inline-flex size-9 shrink-0 items-center justify-center rounded-full border-0 bg-muted/70 text-sm text-muted-foreground shadow-none transition-colors hover:bg-muted hover:text-foreground md:h-9 md:w-full md:max-w-md md:gap-2.5 md:px-3.5 md:text-left dark:bg-muted/50 dark:hover:bg-muted/80',
          className,
        )}
      >
        <Search className="size-4 shrink-0 opacity-70" />
        <span className="hidden min-w-0 flex-1 truncate md:inline">
          Search...
        </span>
        {modKey ? (
          <kbd className="pointer-events-none hidden h-5 items-center gap-0.5 rounded-md border border-border/60 bg-background/80 px-1.5 font-sans text-[10px] font-medium text-muted-foreground md:inline-flex dark:bg-background/40">
            <span>{modKey}</span>
            <span>K</span>
          </kbd>
        ) : (
          <span aria-hidden className="hidden h-5 w-10 md:inline-block" />
        )}
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search Refetch"
        description="Search posts or jump to a page"
      >
        <Command shouldFilter={false} className="rounded-none bg-transparent">
          <CommandInput
            placeholder="Search posts, pages, and actions..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {trimmed.length > 0 && trimmed.length < MIN_SEARCH_CHARS
                ? `Type at least ${MIN_SEARCH_CHARS} characters to search posts`
                : 'No results found.'}
            </CommandEmpty>

            {searching ? (
              <CommandGroup
                heading={
                  loadingPosts
                    ? 'Posts · Searching…'
                    : searchError && posts.length > 0
                      ? 'Posts · Couldn’t refresh'
                      : 'Posts'
                }
                className={cn(loadingPosts && posts.length > 0 && 'opacity-60')}
              >
                {posts.length > 0
                  ? posts.map((post) => (
                      <CommandItem
                        key={post.id}
                        value={`post ${post.id} ${post.title}`}
                        onSelect={() =>
                          run(() =>
                            navigate({
                              to: '/threads/$threadId',
                              params: { threadId: post.id },
                            }),
                          )
                        }
                      >
                        <CommandIcon>
                          <FileText />
                        </CommandIcon>
                        <ItemLabel
                          title={post.title}
                          description={`${post.domain.replace(/^www\./, '')}${
                            post.author ? ` · ${post.author}` : ''
                          }`}
                        />
                      </CommandItem>
                    ))
                  : searchError ? (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        {searchError}
                      </div>
                    ) : loadingPosts ? (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        Searching…
                      </div>
                    ) : (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        No posts found for “{trimmed}”
                      </div>
                    )}
              </CommandGroup>
            ) : null}

            {searching &&
            (navigationItems.length > 0 || createItems.length > 0) ? (
              <CommandSeparator />
            ) : null}

            {navigationItems.length > 0 ? (
              <CommandGroup heading="Navigation">
                {navigationItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.keywords}
                    onSelect={() => run(item.run)}
                  >
                    <CommandIcon>
                      <item.icon />
                    </CommandIcon>
                    <ItemLabel
                      title={item.title}
                      description={item.description}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {navigationItems.length > 0 && createItems.length > 0 ? (
              <CommandSeparator />
            ) : null}

            {createItems.length > 0 ? (
              <CommandGroup heading="Create">
                {createItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.keywords}
                    onSelect={() => run(item.run)}
                  >
                    <CommandIcon className="bg-[var(--brand)]/15 text-[var(--brand)]">
                      <item.icon />
                    </CommandIcon>
                    <ItemLabel
                      title={item.title}
                      description={item.description}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>

          <div className="flex items-center justify-between gap-3 border-t border-border/50 px-3.5 py-2.5 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <CommandKbd className="min-w-0 px-1">
                  <ArrowUp className="size-2.5" />
                </CommandKbd>
                <CommandKbd className="min-w-0 px-1">
                  <ArrowDown className="size-2.5" />
                </CommandKbd>
                navigate
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CommandKbd className="min-w-0 px-1">
                  <CornerDownLeft className="size-2.5" />
                </CommandKbd>
                select
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CommandKbd>esc</CommandKbd>
                close
              </span>
            </div>
            <span className="hidden sm:inline">
              Posts search after {MIN_SEARCH_CHARS}+ characters
            </span>
          </div>
        </Command>
      </CommandDialog>
    </>
  )
}

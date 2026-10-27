import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'
import {
  Bell,
  Bookmark,
  Check,
  CircleUserRound,
  LogOut,
  MessagesSquare,
  Monitor,
  Moon,
  PenLine,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Sun,
  UserRound,
} from 'lucide-react'
import { githubStarsQuery } from '@/lib/queries'
import { LINKS } from '@/lib/constants'
import { useSession, useSignOut } from '@/lib/session'
import { useTheme, type ThemePreference } from '@/lib/theme'
import type { SessionUser } from '@/lib/types'
import { cn, compactNumber } from '@/lib/utils'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '../ui/menu'
import { Tooltip } from '../ui/tooltip'
import { GitHubIcon } from '../brand-icons'
import { Logo } from '../logo'
import { useCommandCenter, useModKey } from '../command-center'
import { Kbd } from '../ui/misc'
import { NotificationBell } from '../notifications/notification-parts'

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function AppHeader() {
  const { user } = useSession()
  const location = useLocation()
  const { open: openSearch } = useCommandCenter()
  const mod = useModKey()
  // Thread pages have no tab bar on phones, so search moves into the header.
  const isThread = location.pathname.startsWith('/threads/')

  return (
    <header className="sticky top-0 z-40 border-b border-glass-border glass">
      <div className="mx-auto flex h-[52px] max-w-[1480px] items-center gap-3 px-4 lg:px-6">
        <Link
          to="/"
          aria-label="Refetch, top stories"
          className="-mx-1 flex pressable items-center rounded-lg px-1 py-1"
        >
          <Logo className="h-[22px] w-auto" />
        </Link>

        <span aria-hidden className="hidden h-5 w-px bg-separator-strong sm:block" />
        <GitHubStars />
        <p className="hidden truncate text-footnote text-label-tertiary xl:block">
          Open-source alternative to YC‑controlled HN
        </p>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={openSearch}
            className="mr-1 hidden h-8 w-52 items-center gap-2 rounded-full bg-fill-secondary pr-1.5 pl-3 text-footnote text-label-tertiary transition-colors hover:bg-fill hover:text-label-secondary md:flex xl:w-60"
          >
            <Search className="size-4" strokeWidth={2.2} aria-hidden />
            <span className="flex-1 text-left">Search Refetch</span>
            <Kbd className="h-5 border-0 bg-surface">{mod} K</Kbd>
          </button>
          {isThread && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Search"
              className="md:hidden"
              onClick={openSearch}
            >
              <Search />
            </Button>
          )}
          <ThemeMenu />
          {user && <NotificationBell />}
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Button asChild variant="ghost" size="sm" className="text-label">
              <Link to="/signin" search={{ redirect: location.href }}>
                Sign in
              </Link>
            </Button>
          )}
          <Button asChild variant="primary" size="sm" className="max-sm:size-8 max-sm:px-0">
            <Link to="/submit" aria-label="Submit a story">
              <Plus strokeWidth={2.5} />
              <span className="max-sm:sr-only">Submit</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

function GitHubStars() {
  const { data: stars } = useQuery(githubStarsQuery())
  return (
    <a
      href={LINKS.github}
      target="_blank"
      rel="noopener noreferrer"
      className="hidden h-7 pressable items-center gap-1.5 rounded-full bg-fill-secondary px-2.5 text-footnote font-medium text-label-secondary hover:bg-fill hover:text-label sm:inline-flex"
    >
      <GitHubIcon className="size-3.5" />
      <span className="sr-only">Star Refetch on GitHub</span>
      <Star className="size-3 text-[#f5a524]" fill="currentColor" aria-hidden />
      {/* Fixed slot so the badge keeps its size while the count loads. */}
      <span className="inline-flex min-w-[3ch] items-center tabular">
        {typeof stars === 'number' ? (
          <span className="animate-fade-in">{compactNumber(stars)}</span>
        ) : (
          <span aria-hidden className="h-2.5 w-[3ch] rounded-full bg-fill" />
        )}
      </span>
    </a>
  )
}

function ThemeMenu({ className }: { className?: string }) {
  const { preference, resolvedTheme, setPreference } = useTheme()
  const Icon = preference === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun
  return (
    <Menu>
      <Tooltip content="Appearance" side="bottom">
        <MenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Appearance"
            className={cn('max-sm:hidden', className)}
          >
            <Icon />
          </Button>
        </MenuTrigger>
      </Tooltip>
      <MenuContent className="min-w-44">
        {THEME_OPTIONS.map((option) => (
          <MenuItem key={option.value} onSelect={() => setPreference(option.value)}>
            <option.icon />
            <span className="flex-1">{option.label}</span>
            {preference === option.value && <Check className="!text-current" />}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  )
}

function UserMenu({ user }: { user: SessionUser }) {
  const signOut = useSignOut()
  const { preference, setPreference } = useTheme()
  const displayName = user.name?.trim() || user.email || 'Your account'

  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${displayName}`}
          className="flex pressable items-center gap-2 rounded-full p-0.5 pr-0.5 hover:bg-fill-secondary sm:pr-2.5"
        >
          <Avatar name={displayName} userId={user.id} size={28} />
          <span className="hidden max-w-36 truncate text-footnote font-semibold text-label sm:block">
            {displayName.split(' ')[0]}
          </span>
        </button>
      </MenuTrigger>
      <MenuContent className="w-64">
        <MenuLabel>
          <div className="flex items-center gap-3 py-1">
            <Avatar name={displayName} userId={user.id} size={36} />
            <div className="min-w-0">
              <p className="truncate text-subhead font-semibold text-label">{displayName}</p>
              {user.email && <p className="truncate text-caption-1 text-label-secondary">{user.email}</p>}
            </div>
          </div>
        </MenuLabel>
        <MenuSeparator />
        <MenuItem asChild>
          <Link to="/u/$userId" params={{ userId: user.id }}>
            <CircleUserRound />
            Your profile
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link to="/messages">
            <MessagesSquare />
            Messages
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link to="/notifications">
            <Bell />
            Notifications
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link to="/saved">
            <Bookmark />
            Saved
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link to="/mines">
            <UserRound />
            Your posts
          </Link>
        </MenuItem>
        {user.moderator && (
          <MenuItem asChild>
            <Link to="/moderation">
              <ShieldCheck />
              Moderation
            </Link>
          </MenuItem>
        )}
        <MenuItem asChild>
          <Link to="/submit">
            <PenLine />
            Submit a story
          </Link>
        </MenuItem>
        <MenuSeparator className="sm:hidden" />
        <div className="sm:hidden">
          {THEME_OPTIONS.map((option) => (
            <MenuItem key={option.value} onSelect={() => setPreference(option.value)}>
              <option.icon />
              <span className="flex-1">{option.label}</span>
              {preference === option.value && <Check className="!text-current" />}
            </MenuItem>
          ))}
        </div>
        <MenuSeparator />
        <MenuItem destructive onSelect={() => void signOut()}>
          <LogOut className="!text-current" />
          Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

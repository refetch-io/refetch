import { useEffect, useState, forwardRef } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ChevronsUpDown,
  Copy,
  FileText,
  LogOut,
  Monitor,
  Moon,
  Settings2,
  Sun,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { persistThemePreference } from '@/components/theme/theme-sync'
import { useAuth } from '@/contexts/auth-context'
import type { AccountPreview } from '@/lib/auth-cookie'
import {
  PRESENCE_STATUS_DOT,
  getPresenceSharingEnabled,
  ownPresenceTone,
} from '@/lib/presence'
import type { ThemePreference } from '@/lib/theme'
import { cn, getInitials } from '@/lib/utils'

function formatMemberSince(createdAt?: string) {
  if (!createdAt) return '-'
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function ThemeSegmentedControl({
  value,
  onChange,
}: {
  value: ThemePreference
  onChange: (theme: ThemePreference) => void
}) {
  const options: { value: ThemePreference; icon: typeof Sun; label: string }[] =
    [
      { value: 'light', icon: Sun, label: 'Light' },
      { value: 'dark', icon: Moon, label: 'Dark' },
      { value: 'system', icon: Monitor, label: 'System' },
    ]

  return (
    <div
      className="inline-flex items-center rounded-full bg-muted p-0.5"
      role="group"
      aria-label="Theme"
    >
      {options.map(({ value: option, icon: Icon, label }) => {
        const selected = value === option
        return (
          <button
            key={option}
            type="button"
            aria-label={label}
            aria-pressed={selected}
            onClick={() => onChange(option)}
            className={cn(
              'flex size-7 items-center justify-center rounded-full transition-colors',
              selected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
          </button>
        )
      })}
    </div>
  )
}

const AccountTrigger = forwardRef<
  HTMLButtonElement,
  {
    displayName: string
    email: string
    initials: string
    presenceTone?: 'online' | 'away' | 'offline'
    presenceLabel?: string
    interactive?: boolean
  }
>(function AccountTrigger(
  {
    displayName,
    email,
    initials,
    presenceTone,
    presenceLabel,
    interactive,
    ...props
  },
  ref,
) {
  return (
    <SidebarMenuButton
      ref={ref}
      size="lg"
      tooltip={
        presenceLabel ? `${displayName} · ${presenceLabel}` : displayName
      }
      className={cn(
        'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
        !interactive && 'pointer-events-none',
      )}
      {...props}
    >
      <span className="relative shrink-0">
        <Avatar className="size-8 rounded-full">
          <AvatarFallback
            delayMs={0}
            className="rounded-full bg-foreground text-[11px] text-background"
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        {presenceTone ? (
          <span
            aria-hidden
            title={presenceLabel}
            className={cn(
              'absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-sidebar transition-colors duration-300',
              PRESENCE_STATUS_DOT[presenceTone],
            )}
          />
        ) : null}
      </span>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{displayName}</span>
        <span className="truncate text-xs text-muted-foreground">
          {email || '\u00a0'}
        </span>
      </div>
      <ChevronsUpDown className="ml-auto size-4" />
    </SidebarMenuButton>
  )
})

export function UserMenu({
  defaultSignedIn = false,
  defaultAccount = null,
}: {
  defaultSignedIn?: boolean
  defaultAccount?: AccountPreview | null
}) {
  const { getUserDisplayName, isAuthenticated, logout, loading, user } =
    useAuth()
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const sync = () => setPageVisible(document.visibilityState === 'visible')
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  // Prefer SSR cookie hint while auth resolves so Sign in vs Account doesn't flash.
  const showSignedIn = loading ? defaultSignedIn : isAuthenticated

  if (!showSignedIn || (!loading && !user)) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild size="lg" tooltip="Sign in">
            <Link to="/signin" search={{}}>
              <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                ?
              </span>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Sign in</span>
                <span className="truncate text-xs text-muted-foreground">
                  Join the discussion
                </span>
              </div>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const preview = user
    ? {
        name: getUserDisplayName() || 'Account',
        email: user.email,
      }
    : defaultAccount
  const displayName = preview?.name || 'Account'
  const email = preview?.email || ''
  const initials = getInitials(displayName, 2)

  const sharing = user ? getPresenceSharingEnabled(user.prefs) : false
  const presenceTone = user
    ? ownPresenceTone({
        sharing,
        visible: pageVisible,
      })
    : undefined
  const presenceLabel =
    presenceTone === 'online'
      ? 'Online'
      : presenceTone === 'away'
        ? 'Away'
        : presenceTone === 'offline'
          ? 'Hidden'
          : undefined

  const verified = Boolean(user?.emailVerification)
  const themeValue: ThemePreference =
    mounted && (theme === 'light' || theme === 'dark' || theme === 'system')
      ? theme
      : 'system'

  const changeTheme = async (next: ThemePreference) => {
    setTheme(next)
    await persistThemePreference(next)
  }

  const copyAccountId = async () => {
    if (!user) return
    try {
      await navigator.clipboard.writeText(user.$id)
      toast.success('Account ID copied')
    } catch {
      toast.error('Could not copy Account ID')
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={!user}>
            <AccountTrigger
              displayName={displayName}
              email={email}
              initials={initials}
              presenceTone={presenceTone}
              presenceLabel={presenceLabel}
              interactive={Boolean(user)}
            />
          </DropdownMenuTrigger>
          {user ? (
            <DropdownMenuContent
              className="w-72 p-0"
              side={isMobile ? 'bottom' : 'top'}
              align="start"
              sideOffset={8}
            >
              <div className="px-3.5 py-3">
                <p className="truncate text-sm font-semibold tracking-tight">
                  {displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {email}
                </p>
              </div>

              <DropdownMenuSeparator className="my-0" />

              <div className="p-1">
                <DropdownMenuItem asChild className="gap-2 px-2.5 py-2">
                  <Link to="/account">
                    <Settings2 />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="gap-2 px-2.5 py-2">
                  <Link to="/mines">
                    <FileText />
                    My posts
                  </Link>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="my-0" />

              <div className="space-y-2.5 px-3.5 py-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Member since</span>
                  <span className="font-medium tabular-nums">
                    {formatMemberSince(user.$createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Presence</span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        presenceTone
                          ? PRESENCE_STATUS_DOT[presenceTone]
                          : 'bg-muted',
                      )}
                    />
                    {presenceLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Account status</span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        verified ? 'bg-emerald-500' : 'bg-amber-500',
                      )}
                    />
                    {verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Account ID</span>
                  <button
                    type="button"
                    onClick={copyAccountId}
                    className="group inline-flex max-w-[9.5rem] items-center gap-1 font-mono text-[11px] font-medium tracking-tight text-foreground hover:text-foreground"
                    title="Copy Account ID"
                  >
                    <span className="truncate">{user.$id}</span>
                    <Copy className="size-3 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" />
                  </button>
                </div>
              </div>

              <DropdownMenuSeparator className="my-0" />

              <div
                className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                onPointerDown={(e) => e.preventDefault()}
              >
                <span className="text-sm">Theme</span>
                {mounted ? (
                  <ThemeSegmentedControl
                    value={themeValue}
                    onChange={changeTheme}
                  />
                ) : (
                  <div className="h-8 w-[5.5rem] animate-pulse rounded-full bg-muted" />
                )}
              </div>

              <DropdownMenuSeparator className="my-0" />

              <div className="p-1">
                <DropdownMenuItem
                  className="gap-2 px-2.5 py-2"
                  onClick={async () => {
                    await logout()
                    window.location.href = '/'
                  }}
                >
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          ) : null}
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

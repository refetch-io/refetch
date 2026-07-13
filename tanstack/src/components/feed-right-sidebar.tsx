import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useOnlinePresences } from '@/hooks/use-online-presences'
import { useAuth } from '@/contexts/auth-context'
import { getInitialsAvatarUrl } from '@/lib/appwrite-web'
import {
  PRESENCE_STATUS_DOT,
  isPresenceSharingEnabled,
  persistPresenceSharing,
} from '@/lib/presence'
import { PresenceVisibilityToggle } from '@/components/presence-visibility-toggle'
import { cn, getInitials } from '@/lib/utils'
import { toast } from 'sonner'

type ChartTab = '24h' | '30d' | '1y'

type ChartPoint = {
  label: string
  visitors: number
}

const TRENDING_TOPICS = [
  'AI',
  'DataScience',
  'OpenSource',
  'DevOps',
  'MachineLearning',
] as const

const PERIODS = [
  { value: '24h' as const, label: '24h', description: 'Last 24 hours' },
  { value: '30d' as const, label: '30d', description: 'Last 30 days' },
  { value: '1y' as const, label: '1y', description: 'Last 12 months' },
]

const chartConfig = {
  visitors: {
    label: 'Visitors',
    color: 'var(--brand)',
  },
} satisfies ChartConfig

const PRESENCE_LIST_MIN_ROWS = 3
/** Comfortable row height without tight hairline separators. */
const PRESENCE_ROW_CLASS = 'flex items-center gap-2.5 py-2.5'

function formatCount(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return String(count)
}

function PresenceListSkeleton({ rows = PRESENCE_LIST_MIN_ROWS }: { rows?: number }) {
  return (
    <div className="flex flex-col divide-y divide-border/40" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="animate-in fade-in-0 duration-500 fill-mode-both"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <div className={PRESENCE_ROW_CLASS}>
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-[58%]" />
              <Skeleton className="h-2.5 w-[42%]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PresenceEmptyState({
  isAuthenticated,
}: {
  isAuthenticated: boolean
}) {
  return (
    <div className="flex min-h-[9.75rem] flex-col justify-center gap-2 animate-in fade-in-0 duration-500">
      <div className="flex -space-x-2" aria-hidden>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="size-7 rounded-full border-2 border-background bg-muted"
            style={{ zIndex: 3 - index }}
          />
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {isAuthenticated
          ? 'No other refetchers online right now.'
          : 'No signed-in refetchers yet. Sign in to appear here.'}
      </p>
    </div>
  )
}

async function fetchAnalytics<T>(type: string): Promise<T> {
  const response = await fetch(`/api/v1/analytics?type=${type}`)
  const payload = await response.json()
  if (!response.ok || payload.error) {
    throw new Error(payload.error || 'Failed to fetch analytics')
  }
  return payload.data as T
}

function LiveViewSection() {
  const { isAuthenticated, user, refreshUser } = useAuth()
  const { users, count, loading, error, statusLabel, statusTone } =
    useOnlinePresences()
  const [isDark, setIsDark] = useState(false)
  const [sharePresence, setSharePresence] = useState(true)
  const [savingPresence, setSavingPresence] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setIsDark(root.classList.contains('dark'))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (user) setSharePresence(isPresenceSharingEnabled(user.prefs))
  }, [user])

  const togglePresenceSharing = async (enabled: boolean) => {
    const previous = sharePresence
    setSharePresence(enabled)
    setSavingPresence(true)
    try {
      await persistPresenceSharing(enabled)
      await refreshUser()
      toast.success(
        enabled ? 'You’re visible as online' : 'Your presence is hidden',
      )
    } catch (err) {
      setSharePresence(previous)
      toast.error(
        err instanceof Error
          ? err.message
          : 'Could not update presence setting',
      )
    } finally {
      setSavingPresence(false)
    }
  }

  const displayCount = error && count === 0 ? '—' : count
  const countLabel = count === 1 ? 'refetcher online' : 'refetchers online'
  const showSkeleton = loading && users.length === 0

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex h-8 items-baseline gap-1.5">
          <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
            {showSkeleton ? '0' : displayCount}
          </p>
          <span className="text-sm text-muted-foreground">
            {showSkeleton ? 'refetchers online' : countLabel}
          </span>
        </div>
        <p className="h-4 text-xs text-muted-foreground">
          {showSkeleton
            ? 'Connecting…'
            : error && count === 0
              ? 'Presence offline'
              : sharePresence
                ? 'Live · Presence'
                : 'Live · You’re hidden'}
        </p>
      </div>

      <div className="relative min-h-[9.75rem]">
        {showSkeleton ? (
          <PresenceListSkeleton />
        ) : users.length > 0 ? (
          <ul className="flex max-h-56 flex-col divide-y divide-border/40 overflow-y-auto overscroll-none">
            {users.map((presenceUser) => {
              const tone = statusTone(presenceUser.status)
              return (
                <li key={presenceUser.userId}>
                  <div className={PRESENCE_ROW_CLASS}>
                    <div className="relative shrink-0">
                      <Avatar size="sm">
                        <AvatarImage
                          src={getInitialsAvatarUrl(
                            presenceUser.name,
                            64,
                            isDark ? 'ffffff' : '000000',
                          )}
                          alt=""
                        />
                        <AvatarFallback className="bg-foreground text-[10px] text-background">
                          {getInitials(presenceUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        aria-hidden
                        className={cn(
                          'absolute right-0 bottom-0 size-2 rounded-full ring-2 ring-background transition-colors duration-300',
                          PRESENCE_STATUS_DOT[tone],
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-5">
                        {presenceUser.name}
                      </p>
                      <p className="truncate text-xs leading-4 text-muted-foreground transition-[color] duration-300">
                        {statusLabel(presenceUser.status, {
                          page: presenceUser.page,
                          activity: presenceUser.activity,
                          name: presenceUser.name,
                        })}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <PresenceEmptyState isAuthenticated={isAuthenticated} />
        )}
      </div>

      {isAuthenticated ? (
        <div className="border-t border-border/50 pt-3">
          <PresenceVisibilityToggle
            enabled={sharePresence}
            disabled={savingPresence}
            onChange={togglePresenceSharing}
          />
        </div>
      ) : null}
    </section>
  )
}

function VisitorsChartSection() {
  const [tab, setTab] = useState<ChartTab>('24h')
  const [series, setSeries] = useState<Record<ChartTab, ChartPoint[]>>({
    '24h': [],
    '30d': [],
    '1y': [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const [data24h, data30d, data1y] = await Promise.all([
          fetchAnalytics<Array<{ hour?: number; visitors: number }>>('24h'),
          fetchAnalytics<Array<{ day?: number; visitors: number }>>('30d'),
          fetchAnalytics<Array<{ month?: string; visitors: number }>>('1y'),
        ])
        if (cancelled) return

        setSeries({
          '24h': (Array.isArray(data24h) ? data24h : []).map((d, i) => ({
            label:
              d.hour !== undefined
                ? `${String(d.hour).padStart(2, '0')}:00`
                : `H${i + 1}`,
            visitors: d.visitors ?? 0,
          })),
          '30d': (Array.isArray(data30d) ? data30d : []).map((d, i) => ({
            label: d.day !== undefined ? `Day ${d.day}` : `D${i + 1}`,
            visitors: d.visitors ?? 0,
          })),
          '1y': (Array.isArray(data1y) ? data1y : []).map((d, i) => ({
            label: d.month ?? `M${i + 1}`,
            visitors: d.visitors ?? 0,
          })),
        })
        setError(false)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const totals = useMemo(
    () => ({
      '24h': series['24h'].reduce((sum, d) => sum + d.visitors, 0),
      '30d': series['30d'].reduce((sum, d) => sum + d.visitors, 0),
      '1y': series['1y'].reduce((sum, d) => sum + d.visitors, 0),
    }),
    [series],
  )

  const activeData = series[tab]
  const periodLabel =
    PERIODS.find((period) => period.value === tab)?.description ?? 'Visitors'

  return (
    <section className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{periodLabel}</p>

      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : error || activeData.length === 0 ? (
        <div
          aria-hidden
          className="relative h-16 w-full overflow-hidden rounded-md bg-muted/30"
        >
          <svg
            viewBox="0 0 240 64"
            className="absolute inset-0 size-full text-muted-foreground/35"
            preserveAspectRatio="none"
          >
            <path
              d="M0 48 C40 44 50 20 80 28 C110 36 120 12 150 22 C180 32 200 40 240 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-16 w-full"
          initialDimension={{ width: 240, height: 64 }}
        >
          <AreaChart
            data={activeData}
            margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-visitors)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-visitors)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel indicator="line" />}
            />
            <Area
              dataKey="visitors"
              type="monotone"
              fill="url(#fillVisitors)"
              stroke="var(--color-visitors)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      )}

      <div className="flex flex-col">
        {PERIODS.map((period, index) => {
          const active = tab === period.value
          return (
            <div key={period.value}>
              <button
                type="button"
                onClick={() => setTab(period.value)}
                className={cn(
                  'flex w-full items-center justify-between py-2 text-left text-sm transition-colors',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span>{period.label}</span>
                <span
                  className={cn(
                    'tabular-nums',
                    active ? 'font-semibold text-foreground' : 'font-medium',
                  )}
                >
                  {loading || error ? '—' : formatCount(totals[period.value])}
                </span>
              </button>
              {index < PERIODS.length - 1 ? <Separator /> : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TrendingTopicsSection() {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Trending now
      </h3>
      <ul className="flex flex-col">
        {TRENDING_TOPICS.map((topic, index) => (
          <li key={topic}>
            <p className="py-2 text-sm text-foreground/90">#{topic}</p>
            {index < TRENDING_TOPICS.length - 1 ? <Separator /> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

function SponsoredSection() {
  return (
    <a
      href="https://appwrite.io?ref=refetch.io"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <img
          src="https://appwrite.io/images/logos/logo.svg"
          alt=""
          width={18}
          height={18}
          className="size-4"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <p className="text-sm font-medium">Appwrite Cloud</p>
          <span className="text-xs text-muted-foreground">Ad</span>
        </div>
        <p className="text-xs leading-snug text-muted-foreground">
          Build faster with our fully managed backend platform.
        </p>
        <p className="mt-2 text-xs font-medium text-primary">Learn more →</p>
      </div>
    </a>
  )
}

export function FeedRightSidebar({ className }: { className?: string }) {
  return (
    <aside className={cn('flex w-full flex-col gap-8', className)}>
      <LiveViewSection />
      <Separator />
      <VisitorsChartSection />
      <Separator />
      <TrendingTopicsSection />
      <Separator />
      <SponsoredSection />
    </aside>
  )
}

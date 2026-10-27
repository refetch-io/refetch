import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Eye, Share, Users } from 'lucide-react'
import { threadStatsQuery } from '@/lib/queries'
import type { ThreadStats } from '@/lib/types'
import { cn, compactNumber } from '@/lib/utils'
import { Card, SectionLabel } from '../ui/card'
import { Skeleton } from '../ui/misc'
import { Sparkline } from '../insights/sparkline'

const TILES = [
  { key: 'views', label: 'Views', short: 'Views', icon: Eye },
  { key: 'visitors', label: 'Visitors', short: 'Visitors', icon: Users },
  { key: 'articleOpens', label: 'Article opens', short: 'Opens', icon: ArrowUpRight },
  { key: 'shares', label: 'Shares', short: 'Shares', icon: Share },
] as const

/** Source rows always take this many lines, so the card keeps its height. */
const SOURCE_ROWS = 3

function formatPoint(interval: ThreadStats['interval']) {
  return (label: string) => {
    const date = new Date(label)
    if (Number.isNaN(date.getTime())) return label
    return interval === '1h'
      ? date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', timeZone: 'UTC' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  }
}

function StatTile({
  tile,
  stats,
  compact,
}: {
  tile: (typeof TILES)[number]
  stats: ThreadStats | undefined
  compact?: boolean
}) {
  const Icon = tile.icon
  return (
    <div className="min-w-0 rounded-[12px] bg-fill-secondary px-3 py-2.5">
      <p className="flex items-center gap-1 text-caption-1 text-label-secondary" title={tile.label}>
        <Icon className="size-3.5 shrink-0 text-label-tertiary" aria-hidden />
        <span className={cn('truncate', compact && 'max-sm:sr-only')}>
          {compact ? tile.short : tile.label}
        </span>
      </p>
      {/* Real line box for the skeleton, so loading and loaded tiles are the same height. */}
      <div className="mt-0.5 flex h-[1lh] items-center font-rounded text-title-3 font-semibold text-label tabular">
        {stats ? (
          <span className="animate-fade-in" title={stats[tile.key].toLocaleString('en-US')}>
            {compactNumber(stats[tile.key])}
          </span>
        ) : (
          <Skeleton className="h-4 w-10 rounded-full" />
        )}
      </div>
    </div>
  )
}

function Sources({ stats }: { stats: ThreadStats | undefined }) {
  if (stats && stats.sources.length === 0) {
    return (
      <p className="grid h-[72px] place-items-center text-caption-1 text-label-tertiary">No visits yet</p>
    )
  }
  const top = stats?.sources[0]?.visitors ?? 1
  return (
    <ol className="space-y-0">
      {Array.from({ length: SOURCE_ROWS }, (_, i) => {
        const source = stats?.sources[i]
        if (!stats) {
          return (
            <li key={i} aria-hidden className="flex h-6 items-center justify-between gap-3">
              <Skeleton className="h-3 rounded-full" style={{ width: `${60 - i * 12}%` }} />
              <Skeleton className="h-3 w-6 rounded-full" />
            </li>
          )
        }
        if (!source) return <li key={i} aria-hidden className="h-6" />
        return (
          <li key={source.label} className="relative flex h-6 animate-fade-in items-center gap-3 px-2">
            <span
              aria-hidden
              className="absolute inset-y-0.5 left-0 rounded-[6px] bg-brand-tint"
              style={{ width: `${Math.max(4, (source.visitors / top) * 100)}%` }}
            />
            <span className="relative min-w-0 flex-1 truncate text-footnote text-label">{source.label}</span>
            <span className="relative shrink-0 text-caption-1 text-label-secondary tabular">
              {compactNumber(source.visitors)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * A thread's Appwrite Analytics: views, visitors, article opens and shares,
 * with a views chart and top sources (compact shows the totals only). The
 * same size while loading and once loaded; hidden when analytics are off.
 */
export function ThreadStatsCard({
  postId,
  compact,
  className,
}: {
  postId: string
  compact?: boolean
  className?: string
}) {
  const { data, isPending } = useQuery(threadStatsQuery(postId))
  if (!isPending && !data) return null
  const stats = data ?? undefined

  if (compact) {
    return (
      <Card className={cn('p-3', className)} aria-label="Story stats">
        <div className="grid grid-cols-4 gap-2">
          {TILES.map((tile) => (
            <StatTile key={tile.key} tile={tile} stats={stats} compact />
          ))}
        </div>
      </Card>
    )
  }

  const chartCaption =
    stats && stats.interval === '1d' && stats.points.length >= 30 ? 'Last 30 days' : 'Since posted'

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-baseline justify-between">
        <SectionLabel className="px-0">Stats</SectionLabel>
        <span className="text-caption-1 text-label-tertiary">Since posted</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {TILES.map((tile) => (
          <StatTile key={tile.key} tile={tile} stats={stats} />
        ))}
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <h3 className="text-caption-1 font-semibold text-label-secondary">Views</h3>
        <span className="text-caption-1 text-label-tertiary">{stats ? chartCaption : ''}</span>
      </div>
      <div className="mt-2 h-[72px]">
        {stats ? (
          <Sparkline points={stats.points} formatLabel={formatPoint(stats.interval)} />
        ) : (
          <Skeleton className="h-full w-full rounded-xl" />
        )}
      </div>

      <h3 className="mt-4 mb-1 text-caption-1 font-semibold text-label-secondary">Top sources</h3>
      <Sources stats={stats} />
    </Card>
  )
}

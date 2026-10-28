import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { todayStatsQuery } from '@/lib/queries'
import { useCountUp } from '@/lib/use-count-up'
import type { TodayStats } from '@/lib/types'
import { cn, compactNumber, pluralize } from '@/lib/utils'
import { Card, SectionLabel } from '../ui/card'
import { Skeleton } from '../ui/misc'

const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`

/** Change against yesterday by this time; hidden when there's nothing to compare with. */
function Delta({ stories, yesterday }: { stories: number; yesterday: number }) {
  if (yesterday === 0) return null
  const change = Math.round(((stories - yesterday) / yesterday) * 100)
  const up = change >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-caption-1 font-semibold tabular',
        up ? 'bg-up-tint text-up' : 'bg-fill-secondary text-label-secondary',
      )}
      title={`${pluralize(yesterday, 'story', 'stories')} yesterday by this time`}
    >
      <Icon aria-hidden className="size-3" strokeWidth={2.5} />
      {Math.abs(change)}%<span className="sr-only"> {up ? 'more' : 'fewer'} than yesterday by this time</span>
    </span>
  )
}

/** The day so far, one bar per UTC hour; hours still ahead are dots. Hovering a bar names it below. */
function HourBars({ hours, hour }: Pick<TodayStats, 'hours' | 'hour'>) {
  const [grown, setGrown] = React.useState(false)
  const [active, setActive] = React.useState<number | null>(null)
  React.useEffect(() => {
    // A timer rather than a frame, so the bars still grow on pages that get no frames.
    const timer = window.setTimeout(() => setGrown(true), 30)
    return () => window.clearTimeout(timer)
  }, [])
  const max = Math.max(1, ...hours)

  return (
    <div className="mt-4">
      <div aria-hidden className="flex h-14 items-end gap-[3px]" onMouseLeave={() => setActive(null)}>
        {hours.map((count, index) => {
          const ahead = index > hour
          return (
            <span
              key={index}
              onMouseEnter={() => !ahead && setActive(index)}
              className="flex h-full flex-1 items-end"
            >
              <span
                className={cn(
                  'w-full rounded-full transition-[height,background-color] duration-700',
                  ahead
                    ? 'bg-fill-secondary'
                    : index === hour
                      ? 'bg-brand dark:bg-brand-text'
                      : active === index
                        ? 'bg-brand/70 dark:bg-brand-text/80'
                        : 'bg-brand/30 dark:bg-brand-text/40',
                )}
                style={{
                  height: ahead || !grown ? 3 : `max(3px, ${(count / max) * 100}%)`,
                  transitionDelay: grown ? `${index * 18}ms` : undefined,
                  transitionTimingFunction: 'var(--ease-out-expo)',
                }}
              />
            </span>
          )
        })}
      </div>
      {/* Fixed height, so swapping the axis for the hovered hour doesn't move anything. */}
      <div className="mt-1.5 flex h-4 items-center justify-between text-caption-2 text-label-tertiary tabular">
        {active === null ? (
          <>
            <span>00:00</span>
            <span>12:00</span>
            <span>24:00</span>
          </>
        ) : (
          <span className="w-full animate-fade-in text-center text-label-secondary">
            {hourLabel(active)}–{hourLabel((active + 1) % 24)} ·{' '}
            {pluralize(hours[active], 'story', 'stories')}
          </span>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    // Term first for screen readers; the number sits on top visually.
    <div className="flex flex-col-reverse items-center gap-0.5">
      <dt className="text-caption-1 text-label-tertiary">{label}</dt>
      <dd className="font-rounded text-headline text-label tabular">{compactNumber(value)}</dd>
    </div>
  )
}

/** "Today" card: stories shared since midnight UTC, hour by hour, and the conversation around them. */
export function TodayWidget() {
  const { data, isPending } = useQuery(todayStatsQuery())
  const stories = useCountUp(data?.stories ?? 0)
  if (!isPending && !data) return null

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <SectionLabel className="px-0">Today</SectionLabel>
        <span className="text-caption-1 text-label-tertiary">Since 00:00 UTC</span>
      </div>

      {/* Fixed height, so the count replacing its skeleton doesn't nudge the card. */}
      <div className="mt-1 flex h-10 items-center justify-between gap-3">
        {data ? (
          <p className="flex animate-fade-in items-baseline gap-2">
            <span className="font-rounded text-title-1 text-label tabular">{stories}</span>
            <span className="text-subhead text-label-secondary">
              {data.stories === 1 ? 'story' : 'stories'} shared
            </span>
          </p>
        ) : (
          <Skeleton className="h-7 w-40 rounded-full" />
        )}
        {data && <Delta stories={data.stories} yesterday={data.yesterday} />}
      </div>

      {data ? (
        <HourBars hours={data.hours} hour={data.hour} />
      ) : (
        <div className="mt-4">
          <Skeleton className="h-14 w-full rounded-xl" />
          <div className="mt-1.5 h-4" />
        </div>
      )}

      <dl className="mt-3 grid h-[50px] grid-cols-3 border-t border-separator pt-3">
        {data ? (
          <>
            <Stat label="Comments" value={data.comments} />
            <Stat label="Votes" value={data.votes} />
            <Stat label="Channels" value={data.channels} />
          </>
        ) : (
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-4 w-10 rounded-full" />
              <Skeleton className="h-3 w-14 rounded-full" />
            </div>
          ))
        )}
      </dl>
    </Card>
  )
}

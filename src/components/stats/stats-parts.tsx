import * as React from 'react'
import { useCountUp } from '@/lib/use-count-up'
import { cn, compactNumber } from '@/lib/utils'
import { Card, SectionLabel } from '../ui/card'
import { Skeleton } from '../ui/misc'

/** Full numbers up to 100K, compact past that. */
export function formatCount(value: number): string {
  return value >= 100_000 ? compactNumber(value) : Math.round(value).toLocaleString('en-US')
}

/** Delays a CSS reveal by a tick, so bars grow in on mount (a timer still fires on pages without frames). */
function useGrown() {
  const [grown, setGrown] = React.useState(false)
  React.useEffect(() => {
    const timer = window.setTimeout(() => setGrown(true), 30)
    return () => window.clearTimeout(timer)
  }, [])
  return grown
}

/** A section of the page: label, optional caption on the right, then its cards. */
export function StatsSection({
  id,
  title,
  caption,
  children,
}: {
  id: string
  title: string
  caption?: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id={id} className="text-title-3 text-label">
          {title}
        </h2>
        {caption && <span className="text-caption-1 text-label-tertiary">{caption}</span>}
      </div>
      {children}
    </section>
  )
}

/** A card with a small uppercase label and an optional caption. */
export function StatsCard({
  label,
  caption,
  className,
  children,
}: {
  label: string
  caption?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <SectionLabel className="px-0">{label}</SectionLabel>
        {caption && <span className="text-caption-1 text-label-tertiary">{caption}</span>}
      </div>
      {children}
    </Card>
  )
}

/** A headline number that rolls up on arrival. */
export function StatTile({
  label,
  value,
  caption,
  format = formatCount,
  className,
}: {
  label: string
  value: number
  caption?: string
  format?: (value: number) => string
  className?: string
}) {
  const shown = useCountUp(value)
  return (
    <Card className={cn('flex flex-col p-4', className)}>
      <dl className="flex flex-col-reverse">
        <dt className="text-footnote font-medium text-label-secondary">{label}</dt>
        <dd className="font-rounded text-title-1 text-label tabular">{format(shown)}</dd>
      </dl>
      {caption && <p className="mt-0.5 text-caption-1 text-label-tertiary">{caption}</p>}
    </Card>
  )
}

export function StatTileSkeleton() {
  return (
    <Card className="p-4" aria-hidden>
      <Skeleton className="mt-1.5 h-7 w-24 rounded-full" />
      <Skeleton className="mt-2.5 h-3.5 w-28 rounded-full" />
      <Skeleton className="mt-2 h-3 w-20 rounded-full" />
    </Card>
  )
}

/** A few small numbers in a row, for the foot of a chart card. */
export function MiniStats({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-y-3 border-t border-separator pt-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col-reverse items-center gap-0.5">
          <dt className="text-caption-1 text-label-tertiary">{item.label}</dt>
          <dd className="font-rounded text-headline text-label tabular">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export interface BarListItem {
  key: string
  label: React.ReactNode
  value: number
  icon?: React.ReactNode
  /** Wraps the row label, e.g. in a Link. */
  wrap?: (children: React.ReactNode) => React.ReactNode
}

/** Ranked rows with a bar behind each label, sized against the top row. */
export function BarList({
  items,
  formatValue = formatCount,
  unit,
}: {
  items: Array<BarListItem>
  formatValue?: (value: number) => string
  /** Spoken after the value, e.g. "visitors". */
  unit: string
}) {
  const grown = useGrown()
  const max = Math.max(1, ...items.map((item) => item.value))
  if (items.length === 0) {
    return <p className="py-6 text-center text-footnote text-label-tertiary">Nothing to show yet.</p>
  }
  return (
    <ol className="space-y-1">
      {items.map((item, index) => {
        const row = (
          <span className="relative flex h-8 items-center gap-2 px-2">
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-[8px] bg-brand/10 transition-[width] duration-700 dark:bg-brand-text/15"
              style={{
                width: grown ? `${Math.max(2, (item.value / max) * 100)}%` : 0,
                transitionDelay: `${index * 40}ms`,
                transitionTimingFunction: 'var(--ease-out-expo)',
              }}
            />
            {item.icon && <span className="relative shrink-0">{item.icon}</span>}
            <span className="relative min-w-0 flex-1 truncate text-subhead text-label">{item.label}</span>
          </span>
        )
        return (
          <li key={item.key} className="flex items-center gap-3">
            <span className="min-w-0 flex-1">{item.wrap ? item.wrap(row) : row}</span>
            <span className="w-12 shrink-0 text-right font-rounded text-footnote font-semibold text-label-secondary tabular">
              {formatValue(item.value)}
              <span className="sr-only"> {unit}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function BarListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-1" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-8 items-center gap-3">
          <Skeleton className="h-8 rounded-[8px]" style={{ width: `${88 - i * 11}%` }} />
          <Skeleton className="ml-auto h-3 w-8 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** Vertical bars (one per period) with the hovered bar named under the chart. */
export function ColumnChart({
  points,
  formatLabel,
  describe,
  axis,
  height = 120,
}: {
  points: Array<{ label: string; value: number }>
  formatLabel: (label: string) => string
  /** "12 stories" for a value. */
  describe: (value: number) => string
  /** Labels under the chart at rest: first, middle and last. */
  axis: [string, string, string]
  height?: number
}) {
  const grown = useGrown()
  const [active, setActive] = React.useState<number | null>(null)
  const max = Math.max(1, ...points.map((point) => point.value))
  const gap = points.length > 20 ? 2 : 4

  return (
    <div>
      <div
        role="img"
        aria-label={`${points.length} bars, peaking at ${describe(max)}`}
        className="flex items-end"
        style={{ height, gap }}
        onMouseLeave={() => setActive(null)}
      >
        {points.map((point, index) => (
          <span
            key={point.label}
            onMouseEnter={() => setActive(index)}
            onPointerDown={() => setActive(index)}
            className="flex h-full flex-1 items-end"
          >
            <span
              className={cn(
                'w-full rounded-t-[4px] transition-[height,background-color] duration-700',
                active === index
                  ? 'bg-brand dark:bg-brand-text'
                  : index === points.length - 1
                    ? 'bg-brand/70 dark:bg-brand-text/75'
                    : 'bg-brand/35 dark:bg-brand-text/40',
              )}
              style={{
                height: grown ? `max(3px, ${(point.value / max) * 100}%)` : 3,
                transitionDelay: grown ? `${index * 14}ms` : undefined,
                transitionTimingFunction: 'var(--ease-out-expo)',
              }}
            />
          </span>
        ))}
      </div>
      {/* Fixed height, so swapping the axis for the hovered bar doesn't move anything. */}
      <div className="mt-2 flex h-4 items-center justify-between text-caption-2 text-label-tertiary tabular">
        {active === null ? (
          axis.map((label, index) => <span key={index}>{label}</span>)
        ) : (
          <span className="w-full animate-fade-in text-center text-label-secondary">
            {formatLabel(points[active].label)} · {describe(points[active].value)}
          </span>
        )}
      </div>
    </div>
  )
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`

/** Seven rows of 24 hours, shaded by how many people visited then. */
export function WeekHeatmap({ grid }: { grid: Array<Array<number>> }) {
  const [active, setActive] = React.useState<[number, number] | null>(null)
  const max = Math.max(1, ...grid.flat())
  const busiest = React.useMemo(() => {
    let best: [number, number] = [0, 0]
    grid.forEach((row, day) =>
      row.forEach((value, hour) => {
        if (value > grid[best[0]][best[1]]) best = [day, hour]
      }),
    )
    return best
  }, [grid])

  return (
    <div>
      <div
        role="img"
        aria-label={`Busiest hour: ${WEEKDAYS[busiest[0]]} ${hourLabel(busiest[1])} UTC`}
        className="grid grid-cols-[28px_1fr] gap-x-2 gap-y-[3px]"
        onMouseLeave={() => setActive(null)}
      >
        {grid.map((row, day) => (
          <React.Fragment key={day}>
            <span className="self-center text-caption-2 text-label-tertiary">{WEEKDAYS[day]}</span>
            <span className="grid grid-cols-24 gap-[3px]">
              {row.map((value, hour) => {
                const on = active?.[0] === day && active[1] === hour
                return (
                  <span
                    key={hour}
                    onMouseEnter={() => setActive([day, hour])}
                    onPointerDown={() => setActive([day, hour])}
                    className={cn(
                      'relative aspect-square rounded-[3px] bg-fill-secondary',
                      on && 'ring-2 ring-label/60',
                    )}
                  >
                    {value > 0 && (
                      <span
                        className="absolute inset-0 rounded-[3px] bg-brand dark:bg-brand-text"
                        // Square root, so one busy hour doesn't wash out the rest of the week.
                        style={{ opacity: 0.12 + 0.88 * Math.sqrt(value / max) }}
                      />
                    )}
                  </span>
                )
              })}
            </span>
          </React.Fragment>
        ))}
      </div>
      <div className="mt-2 ml-9 flex h-4 items-center justify-between text-caption-2 text-label-tertiary tabular">
        {active === null ? (
          <>
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </>
        ) : (
          <span className="w-full animate-fade-in text-center text-label-secondary">
            {WEEKDAYS[active[0]]} {hourLabel(active[1])}–{hourLabel((active[1] + 1) % 24)} UTC ·{' '}
            {formatCount(grid[active[0]][active[1]])} visitors
          </span>
        )}
      </div>
    </div>
  )
}

/** "<1%" for slivers, so a real share never reads as 0%. */
function sharePercent(share: number) {
  return share > 0 && share < 0.005 ? '<1%' : `${Math.round(share * 100)}%`
}

/** A share of a whole as a thin segmented bar with a legend underneath. */
export function ShareBar({ items }: { items: Array<{ label: string; value: number }> }) {
  const grown = useGrown()
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1
  // Brand first, then lighter steps of the same hue: one series, ordered by size.
  const shades = [
    'bg-brand dark:bg-brand-text',
    'bg-brand/55 dark:bg-brand-text/60',
    'bg-brand/25 dark:bg-brand-text/30',
    'bg-fill-strong',
  ]
  return (
    <div>
      <div aria-hidden className="flex h-2.5 gap-[2px] overflow-hidden rounded-full">
        {items.map((item, index) => (
          <span
            key={item.label}
            className={cn('h-full transition-[flex-grow] duration-700', shades[index % shades.length])}
            style={{ flexGrow: grown ? item.value : 0, transitionTimingFunction: 'var(--ease-out-expo)' }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1.5 text-footnote text-label-secondary">
            <span aria-hidden className={cn('size-2 rounded-full', shades[index % shades.length])} />
            {item.label}
            <span className="font-semibold text-label tabular">{sharePercent(item.value / total)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

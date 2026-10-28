import * as React from 'react'
import type { VisitorPoint } from '@/lib/types'
import { cn } from '@/lib/utils'

const WIDTH = 300
const HEIGHT = 72
const PAD_TOP = 6

/** Smooth path through points (Catmull–Rom converted to cubic Béziers). */
function smoothPath(points: Array<[number, number]>) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M${points[0][0]},${points[0][1]}`
  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i - 1] ?? points[i]
    const [x1, y1] = points[i]
    const [x2, y2] = points[i + 1]
    const [x3, y3] = points[i + 2] ?? points[i + 1]
    const t = 0.18
    d += ` C${x1 + (x2 - x0) * t},${y1 + (y2 - y0) * t} ${x2 - (x3 - x1) * t},${y2 - (y3 - y1) * t} ${x2},${y2}`
  }
  return d
}

interface SparklineProps {
  points: Array<VisitorPoint>
  formatLabel: (label: string) => string
  className?: string
}

export function Sparkline({ points, formatLabel, className }: SparklineProps) {
  const id = React.useId()
  const [hover, setHover] = React.useState<number | null>(null)
  // The line draws in from the left on mount and whenever the data changes (a new range).
  // A timer rather than a frame, so it still finishes on pages that get no frames.
  const [revealed, setRevealed] = React.useState(false)
  React.useEffect(() => {
    setRevealed(false)
    const timer = window.setTimeout(() => setRevealed(true), 30)
    return () => window.clearTimeout(timer)
  }, [points])
  const max = Math.max(1, ...points.map((p) => p.visitors))

  const coords = points.map((p, i): [number, number] => [
    points.length === 1 ? WIDTH / 2 : (i / (points.length - 1)) * WIDTH,
    PAD_TOP + (1 - p.visitors / max) * (HEIGHT - PAD_TOP - 2),
  ])
  const line = smoothPath(coords)
  const area = coords.length ? `${line} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z` : ''

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    setHover(Math.round(ratio * (points.length - 1)))
  }

  const active = hover !== null ? points[hover] : null
  const activeX = hover !== null ? (coords[hover][0] / WIDTH) * 100 : 0
  const activeY = hover !== null ? (coords[hover][1] / HEIGHT) * 100 : 0

  return (
    <div
      className={cn('relative touch-none select-none', className)}
      onPointerMove={onMove}
      onPointerDown={onMove}
      onPointerLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        // Only the reveal transitions; hiding again is instant so a new range starts from the left.
        className={cn(
          'block h-[72px] w-full overflow-visible',
          revealed && 'transition-[clip-path] duration-1000',
        )}
        style={{
          clipPath: revealed ? 'inset(-12px 0 -12px 0)' : 'inset(-12px 100% -12px 0)',
          transitionTimingFunction: 'var(--ease-out-expo)',
        }}
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-2)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--brand-2)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-stroke`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--brand)" />
            <stop offset="100%" stopColor="var(--brand-2)" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id}-fill)`} />
        <path
          d={line}
          fill="none"
          stroke={`url(#${id}-stroke)`}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {active && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-px bg-separator-strong"
            style={{ left: `${activeX}%` }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-brand shadow-raised"
            style={{ left: `${activeX}%`, top: `${activeY}%` }}
          />
          <div
            className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 rounded-full glass-strong px-2.5 py-1 text-caption-1 whitespace-nowrap shadow-popover"
            style={{ left: `clamp(48px, ${activeX}%, calc(100% - 48px))` }}
          >
            <span className="font-semibold text-label tabular">
              {active.visitors.toLocaleString('en-US')}
            </span>
            <span className="text-label-secondary"> · {formatLabel(active.label)}</span>
          </div>
        </>
      )}
    </div>
  )
}

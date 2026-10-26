import * as React from 'react'
import { cn } from '@/lib/utils'

/*
 * The meadow at the end of a feed, set to the reader's local time of day and
 * season: a sun that rises and sets, a moon and stars at night, flowers in
 * spring, falling leaves in autumn, snow in winter.
 */

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export function sceneFor(date: Date, southern = false): { time: TimeOfDay; season: Season } {
  const hour = date.getHours()
  const time: TimeOfDay =
    hour >= 5 && hour < 10
      ? 'morning'
      : hour >= 10 && hour < 17
        ? 'day'
        : hour >= 17 && hour < 20
          ? 'evening'
          : 'night'
  const month = (date.getMonth() + (southern ? 6 : 0)) % 12
  const season: Season =
    month >= 2 && month <= 4
      ? 'spring'
      : month >= 5 && month <= 7
        ? 'summer'
        : month >= 8 && month <= 10
          ? 'autumn'
          : 'winter'
  return { time, season }
}

/** Southern Hemisphere time zones flip the seasons. */
function isSouthern() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
  return /^(Australia|Antarctica|Pacific\/Auckland|Pacific\/Chatham|America\/(Argentina|Santiago|Sao_Paulo|Montevideo|Asuncion|La_Paz|Lima)|Africa\/(Johannesburg|Maputo|Harare|Windhoek|Gaborone|Maseru|Mbabane|Lusaka)|Indian\/(Mauritius|Reunion))/.test(
    zone,
  )
}

/** The scene is only known in the browser; render hidden until then so it never flips visibly. */
function useScene() {
  const [scene, setScene] = React.useState<{ time: TimeOfDay; season: Season } | null>(null)
  React.useEffect(() => setScene(sceneFor(new Date(), isSouthern())), [])
  return scene
}

const SKY: Record<TimeOfDay, { top: string; opacity: number }> = {
  morning: { top: '#ffb340', opacity: 0.16 },
  day: { top: '#5ac8fa', opacity: 0.16 },
  evening: { top: '#ff6b5a', opacity: 0.2 },
  night: { top: '#4e1cb3', opacity: 0.26 },
}

const LAND: Record<
  Season,
  { ground: string; groundOpacity: number; line: string; grass: [string, string]; leaves: [string, string] }
> = {
  spring: {
    ground: '#34c759',
    groundOpacity: 0.18,
    line: '#34c759',
    grass: ['#34c759', '#30d158'],
    leaves: ['#34c759', '#30d158'],
  },
  summer: {
    ground: '#30b84f',
    groundOpacity: 0.24,
    line: '#30b84f',
    grass: ['#28a745', '#34c759'],
    leaves: ['#2fb350', '#34c759'],
  },
  autumn: {
    ground: '#ff9f0a',
    groundOpacity: 0.18,
    line: '#e8902a',
    grass: ['#d98a2b', '#c8a03a'],
    leaves: ['#ff9f0a', '#ffb340'],
  },
  winter: {
    ground: '#dbe9f7',
    groundOpacity: 0.75,
    line: '#b9cfe4',
    grass: ['#9db7cc', '#b4c9da'],
    leaves: ['#8fb9a8', '#a3c6b6'],
  },
}

const GRASS_X = [30, 42, 58, 140, 152, 170, 182]

export function FeedEndArt({
  done,
  className,
  scene: forced,
}: {
  done: boolean
  className?: string
  /** Pin a scene (design catalog); otherwise it follows the reader's clock. */
  scene?: { time: TimeOfDay; season: Season }
}) {
  const live = useScene()
  const scene = forced ?? live
  const time = scene?.time ?? 'day'
  const season = scene?.season ?? 'summer'
  const sky = SKY[time]
  const land = LAND[season]
  const id = React.useId().replace(/:/g, '')

  return (
    <svg
      viewBox="0 0 208 104"
      className={cn('transition-opacity duration-500', scene ? 'opacity-100' : 'opacity-0', className)}
      aria-hidden
      fill="none"
      data-scene={scene ? `${time}-${season}` : undefined}
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.top} stopOpacity={sky.opacity} />
          <stop offset="1" stopColor={time === 'evening' ? '#ffb340' : sky.top} stopOpacity="0" />
        </linearGradient>
        <mask id={`${id}-moon`}>
          <circle cx="160" cy="26" r="10" fill="white" />
          <circle cx="165" cy="22" r="9" fill="black" />
        </mask>
      </defs>
      <rect x="20" y="4" width="168" height="84" rx="42" fill={`url(#${id}-sky)`} />

      {/* Sun or moon */}
      {time === 'night' ? (
        <>
          <circle cx="160" cy="26" r="10" fill="#f4f1e4" mask={`url(#${id}-moon)`} />
          {[
            [48, 18, 1.2],
            [72, 30, 0.9],
            [96, 14, 1.1],
            [124, 24, 0.8],
            [138, 12, 1],
            [62, 46, 0.8],
            [180, 44, 0.9],
          ].map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#f4f1e4" opacity="0.85" />
          ))}
        </>
      ) : time === 'morning' ? (
        <>
          <circle cx="46" cy="44" r="17" fill="#ffb340" opacity="0.18" />
          <circle cx="46" cy="44" r="10" fill="#ffb340" />
        </>
      ) : time === 'evening' ? (
        <>
          <circle cx="160" cy="64" r="20" fill="#ff7a45" opacity="0.18" />
          <circle cx="160" cy="64" r="12" fill="#ff7a45" />
        </>
      ) : (
        <>
          <circle cx="160" cy="26" r="17" fill="#ffcc00" opacity="0.18" />
          <circle cx="160" cy="26" r="11" fill="#ffcc00" />
        </>
      )}

      {/* Clouds by day */}
      {time !== 'night' && (
        <>
          <rect x="66" y="20" width="38" height="12" rx="6" fill="var(--fill)" />
          <rect x="76" y="13" width="20" height="14" rx="7" fill="var(--fill)" />
          {time === 'day' && <rect x="118" y="44" width="26" height="9" rx="4.5" fill="var(--fill)" />}
        </>
      )}

      {/* Falling leaves or snow */}
      {season === 'autumn' &&
        [
          [70, 46, -30, '#ff9f0a'],
          [118, 34, 25, '#ff6b3d'],
          [184, 58, -15, '#ffcc00'],
        ].map(([x, y, angle, color]) => (
          <ellipse
            key={`${x}`}
            cx={x}
            cy={y}
            rx="3.6"
            ry="1.8"
            fill={color as string}
            transform={`rotate(${angle} ${x} ${y})`}
          />
        ))}
      {season === 'winter' &&
        [
          [44, 30],
          [60, 52],
          [84, 40],
          [112, 18],
          [126, 50],
          [146, 38],
          [178, 56],
          [100, 60],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" className="fill-[#a9c3dc] dark:fill-white" />
        ))}

      {/* Ground */}
      <ellipse
        cx="104"
        cy="92"
        rx="88"
        ry="11"
        fill={land.ground}
        opacity={land.groundOpacity}
        // Snow would glare on dark surfaces.
        className={season === 'winter' ? 'dark:opacity-35' : undefined}
      />
      <path
        d="M22 92c22-7 52-10 82-10s60 3 82 10"
        stroke={land.line}
        strokeOpacity="0.5"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Grass */}
      {GRASS_X.map((x, i) => (
        <path
          key={x}
          d={
            season === 'winter'
              ? `M${x} 90c${i % 2 ? 1 : -1}-3 ${i % 2 ? 1 : -1}-5 ${i % 2 ? 2 : -2}-7`
              : `M${x} 90c${i % 2 ? 2 : -2}-5 ${i % 2 ? 1 : -1}-9 ${i % 2 ? 4 : -4}-13M${x + 4} 90c0-4 2-7 5-9`
          }
          stroke={land.grass[i % 2]}
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}

      {/* Spring flowers */}
      {season === 'spring' &&
        [
          [36, 78, '#ff6b9a'],
          [64, 80, '#ffcc00'],
          [146, 78, '#bf5af2'],
          [176, 79, '#ff6b9a'],
        ].map(([cx, cy, color]) => (
          <g key={`${cx}`}>
            <circle cx={cx} cy={cy} r="3" fill={color as string} />
            <circle cx={cx} cy={cy} r="1.1" fill="#fff6d5" />
          </g>
        ))}

      {/* Sprout */}
      <path
        d="M100 88V64"
        stroke={season === 'autumn' ? '#b98a3a' : '#2fb350'}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M100 72c-3-10-12-14-21-12 2 9 10 14 21 12Z" fill={land.leaves[0]} />
      <path d="M100 66c3-11 13-16 23-13-2 10-11 15-23 13Z" fill={land.leaves[1]} />
      {season === 'winter' && (
        <>
          <path d="M80 61c4-2 10-1 14 2" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M106 56c4-3 10-4 16-2" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {done ? (
        /* Finish flag */
        <g>
          <path d="M136 88V50" stroke="var(--label-tertiary)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M137 51h20l-5 7 5 7h-20Z" fill="var(--brand)" />
        </g>
      ) : (
        /* Signpost pointing down to the next page */
        <g>
          <path d="M140 88V56" stroke="var(--label-tertiary)" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="124" y="46" width="32" height="14" rx="4" fill="var(--brand)" />
          <path
            d="M136 50.5v5m0 0-2.5-2.5m2.5 2.5 2.5-2.5M144 50.5h4"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  )
}

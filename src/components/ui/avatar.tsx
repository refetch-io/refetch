import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { configQuery } from '@/lib/queries'
import { cn, hashString, initials, isBotUser } from '@/lib/utils'

/** Gradient pairs for monogram avatars — deterministic per name. */
const GRADIENTS = [
  ['#7c5cff', '#4e1cb3'],
  ['#ff7a8a', '#e0445f'],
  ['#ffb35c', '#f07a1a'],
  ['#56d364', '#1f9d55'],
  ['#5ac8fa', '#1e7fd6'],
  ['#c084fc', '#8b3fd9'],
  ['#5eead4', '#0f9488'],
  ['#a3a3ad', '#6b6b76'],
]

/* Bumped after someone changes their photo, so cached images refresh. */
const versions = new Map<string, number>()
const listeners = new Set<() => void>()

export function refreshAvatar(userId: string) {
  versions.set(userId, Date.now())
  for (const listener of listeners) listener()
}

function useAvatarVersion(userId: string | undefined) {
  return React.useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => (userId ? (versions.get(userId) ?? 0) : 0),
    () => 0,
  )
}

/* Photos that already loaded or 404'd this session, so remounts render the final state straight away. */
const photoStatus = new Map<string, 'loaded' | 'failed'>()

interface AvatarProps {
  name: string
  /** With a user ID, shows their photo from Appwrite Avatars (uploaded, OAuth, Gravatar…). */
  userId?: string
  size?: number
  className?: string
}

/** Scout's avatar, or someone's photo (with a monogram fallback). */
export function Avatar(props: AvatarProps) {
  if (props.userId != null && isBotUser(props.userId)) {
    return <ScoutAvatar size={props.size} className={props.className} />
  }
  return <PersonAvatar {...props} />
}

/** Past this size the radar beam sweeps (unless reduced motion is on). */
const SCOUT_SWEEP_MIN_SIZE = 48

/** A radar in Refetch purple: Scout scanning the web, with a few stories picked up. */
function ScoutAvatar({ size = 32, className }: { size?: number; className?: string }) {
  const id = React.useId()
  const glow = `${id}-glow`
  const beam = `${id}-beam`
  return (
    <span
      aria-hidden
      className={cn('relative inline-flex shrink-0 overflow-hidden rounded-full select-none', className)}
      style={{ width: size, height: size, boxShadow: 'inset 0 0 0 0.5px rgb(0 0 0 / 0.08)' }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="block">
        <defs>
          <radialGradient id={glow} cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="55%" stopColor="#4e1cb3" />
            <stop offset="100%" stopColor="#24096a" />
          </radialGradient>
          <linearGradient id={beam} gradientUnits="userSpaceOnUse" x1="9" y1="30" x2="32" y2="7">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" fill={`url(#${glow})`} />
        <g fill="none" stroke="#fff" strokeWidth="1">
          <circle cx="32" cy="32" r="26" strokeOpacity="0.2" />
          <circle cx="32" cy="32" r="17.5" strokeOpacity="0.2" />
          <circle cx="32" cy="32" r="9" strokeOpacity="0.2" />
          <path d="M32 4v56M4 32h56" strokeOpacity="0.1" />
        </g>
        <g
          className={cn(
            size >= SCOUT_SWEEP_MIN_SIZE && 'animate-[spin_6s_linear_infinite] motion-reduce:animate-none',
          )}
          style={{ transformOrigin: '32px 32px' }}
        >
          <path d="M32 32 L6.9 25.3 A26 26 0 0 1 32 6 Z" fill={`url(#${beam})`} />
          <path d="M32 32V6" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.25" strokeLinecap="round" />
        </g>
        <circle cx="44" cy="19" r="4.5" fill="#fff" fillOpacity="0.18" />
        <circle cx="44" cy="19" r="2.4" fill="#fff" />
        <circle cx="21" cy="42" r="1.7" fill="#fff" fillOpacity="0.7" />
        <circle cx="46" cy="41" r="1.3" fill="#fff" fillOpacity="0.45" />
        <circle cx="32" cy="32" r="2.2" fill="#fff" />
      </svg>
    </span>
  )
}

/**
 * Profile photo, or a Contacts-style monogram when there's none. While a photo we haven't seen yet
 * is loading, the circle stays a quiet neutral fill and the photo fades in, so a monogram never
 * flashes up before the real picture.
 */
function PersonAvatar({ name, userId, size = 32, className }: AvatarProps) {
  const { data: config } = useSuspenseQuery(configQuery())
  const version = useAvatarVersion(userId)
  const [from, to] = GRADIENTS[hashString(name || '?') % GRADIENTS.length]
  const pixels = Math.min(512, Math.ceil(size * 2))
  const src = userId
    ? `${config.appwriteEndpoint}/avatars/photo?userId=${encodeURIComponent(userId)}&name=${encodeURIComponent(
        name || '',
      )}&width=${pixels}&height=${pixels}&project=${config.appwriteProjectId}${version ? `&v=${version}` : ''}`
    : undefined

  const [status, setStatus] = React.useState<'pending' | 'loaded' | 'failed'>(() =>
    src ? (photoStatus.get(src) ?? 'pending') : 'failed',
  )
  /* Only photos seen for the first time fade in; cached ones paint immediately. */
  const [fresh, setFresh] = React.useState(() => !src || photoStatus.get(src) !== 'loaded')

  React.useEffect(() => {
    const cached = src ? photoStatus.get(src) : 'failed'
    setFresh(cached !== 'loaded')
    setStatus(cached ?? 'pending')
  }, [src])

  const settle = React.useCallback(
    (next: 'loaded' | 'failed') => {
      if (src) photoStatus.set(src, next)
      setStatus(next)
    },
    [src],
  )

  /* Server-rendered images can finish before hydration attaches onLoad/onError. */
  const imgRef = React.useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete) settle(img.naturalWidth > 0 ? 'loaded' : 'failed')
    },
    [settle],
  )

  const monogram = status === 'failed'

  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-rounded font-semibold text-white select-none',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        backgroundColor: 'var(--fill)',
        backgroundImage: monogram ? `linear-gradient(180deg, ${from}, ${to})` : undefined,
        boxShadow: 'inset 0 0 0 0.5px rgb(0 0 0 / 0.08)',
      }}
    >
      {monogram && initials(name)}
      {src && status !== 'failed' && (
        <img
          key={src}
          ref={imgRef}
          src={src}
          alt=""
          width={size}
          height={size}
          loading={fresh ? 'lazy' : 'eager'}
          decoding={fresh ? 'async' : 'sync'}
          draggable={false}
          onLoad={() => settle('loaded')}
          onError={() => settle('failed')}
          className={cn(
            'absolute inset-0 size-full object-cover',
            fresh && 'transition-opacity duration-200',
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </span>
  )
}

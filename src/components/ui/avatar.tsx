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

/**
 * Profile photo, or a Contacts-style monogram when there's none. While a photo we haven't seen yet
 * is loading, the circle stays a quiet neutral fill and the photo fades in, so a monogram never
 * flashes up before the real picture.
 */
export function Avatar({ name, userId, size = 32, className }: AvatarProps) {
  const { data: config } = useSuspenseQuery(configQuery())
  const version = useAvatarVersion(userId)
  const [from, to] = GRADIENTS[hashString(name || '?') % GRADIENTS.length]
  const pixels = Math.min(512, Math.ceil(size * 2))
  const src =
    userId && !isBotUser(userId)
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

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

interface AvatarProps {
  name: string
  /** With a user ID, shows their photo from Appwrite Avatars (uploaded, OAuth, Gravatar…). */
  userId?: string
  size?: number
  className?: string
}

/** Profile photo over a Contacts-style monogram, which shows while loading or if there's no photo. */
export function Avatar({ name, userId, size = 32, className }: AvatarProps) {
  const { data: config } = useSuspenseQuery(configQuery())
  const version = useAvatarVersion(userId)
  const [failed, setFailed] = React.useState(false)
  const [from, to] = GRADIENTS[hashString(name || '?') % GRADIENTS.length]
  const photo = userId && !isBotUser(userId) && !failed
  const pixels = Math.min(512, Math.ceil(size * 2))

  React.useEffect(() => setFailed(false), [userId, version])

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
        backgroundImage: `linear-gradient(180deg, ${from}, ${to})`,
        boxShadow: 'inset 0 0 0 0.5px rgb(0 0 0 / 0.08)',
      }}
    >
      {initials(name)}
      {photo && (
        <img
          src={`${config.appwriteEndpoint}/avatars/photo?userId=${encodeURIComponent(userId)}&name=${encodeURIComponent(
            name || '',
          )}&width=${pixels}&height=${pixels}&project=${config.appwriteProjectId}${version ? `&v=${version}` : ''}`}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </span>
  )
}

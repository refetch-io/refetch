import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Globe } from 'lucide-react'
import { configQuery } from '@/lib/queries'
import { cn } from '@/lib/utils'

/**
 * Icons that failed to load, shared by every Favicon on the page: the first
 * failure swaps all icons for that site, and rows mounted later skip the request.
 */
const failedSources = new Set<string>()
const listeners = new Set<() => void>()

function markFailed(src: string) {
  if (failedSources.has(src)) return
  failedSources.add(src)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Site icon via Appwrite Avatars, on a small white tile so it reads in dark mode. */
export function Favicon({
  domain,
  size = 16,
  className,
}: {
  domain: string | null
  size?: number
  className?: string
}) {
  const { data: config } = useSuspenseQuery(configQuery())
  const src = domain
    ? `${config.appwriteEndpoint}/avatars/favicon?url=${encodeURIComponent(
        `https://${domain}`,
      )}&project=${config.appwriteProjectId}`
    : null
  const failed = React.useSyncExternalStore(
    subscribe,
    () => src !== null && failedSources.has(src),
    () => false,
  )

  // Server-rendered images can fail before hydration attaches onError, so check on mount too.
  const checkImage = React.useCallback(
    (img: HTMLImageElement | null) => {
      if (src && img?.complete && img.naturalWidth === 0) markFailed(src)
    },
    [src],
  )

  const tile = cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-white ring-[0.5px] ring-black/10',
    className,
  )

  if (!src || failed) {
    return (
      <span className={cn(tile, 'bg-fill ring-0')} style={{ width: size, height: size }} aria-hidden>
        <Globe className="text-label-tertiary" style={{ width: size * 0.7, height: size * 0.7 }} />
      </span>
    )
  }

  return (
    <span className={tile} style={{ width: size, height: size }} aria-hidden>
      <img
        ref={checkImage}
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => markFailed(src)}
        className="size-full object-contain"
      />
    </span>
  )
}

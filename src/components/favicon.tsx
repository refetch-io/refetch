import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Globe } from 'lucide-react'
import { configQuery } from '@/lib/queries'
import { cn } from '@/lib/utils'

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
  const [failed, setFailed] = React.useState(false)

  const tile = cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-white ring-[0.5px] ring-black/10',
    className,
  )

  if (!domain || failed) {
    return (
      <span className={cn(tile, 'bg-fill ring-0')} style={{ width: size, height: size }} aria-hidden>
        <Globe className="text-label-tertiary" style={{ width: size * 0.7, height: size * 0.7 }} />
      </span>
    )
  }

  const src = `${config.appwriteEndpoint}/avatars/favicon?url=${encodeURIComponent(
    `https://${domain}`,
  )}&project=${config.appwriteProjectId}`

  return (
    <span className={tile} style={{ width: size, height: size }} aria-hidden>
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="size-full object-contain"
      />
    </span>
  )
}

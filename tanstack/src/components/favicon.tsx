import { useEffect, useState } from 'react'
import { getFaviconUrl } from '@/lib/appwrite-web'
import { cn } from '@/lib/utils'

/** 1×1 transparent GIF - safe fallback that never paints a broken-image icon. */
const EMPTY_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

interface FaviconProps {
  domain: string
  size?: number
  className?: string
}

export function Favicon({ domain, size = 16, className }: FaviconProps) {
  const remoteSrc = domain?.trim() ? getFaviconUrl(domain.trim()) : ''
  const [src, setSrc] = useState(remoteSrc || EMPTY_PIXEL)

  useEffect(() => {
    setSrc(remoteSrc || EMPTY_PIXEL)
  }, [remoteSrc])

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      decoding="async"
      className={cn(
        'shrink-0 rounded-[3px] bg-muted object-contain ring-1 ring-border/60',
        className,
      )}
      onError={() => {
        setSrc((current) => (current === EMPTY_PIXEL ? current : EMPTY_PIXEL))
      }}
    />
  )
}

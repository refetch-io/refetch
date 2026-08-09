import { useEffect, useState } from 'react'
import { getFaviconUrl } from '@/lib/appwrite-web'
import { cn } from '@/lib/utils'

interface FaviconProps {
  domain: string
  size?: number
  className?: string
}

export function Favicon({ domain, size = 16, className }: FaviconProps) {
  const remoteSrc = domain?.trim() ? getFaviconUrl(domain.trim()) : ''
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [remoteSrc])

  return (
    <span
      aria-hidden
      className={cn(
        'inline-block shrink-0 overflow-hidden rounded-[3px] bg-muted ring-1 ring-border/60 dark:bg-white',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {remoteSrc && !failed ? (
        <img
          src={remoteSrc}
          alt=""
          width={size}
          height={size}
          decoding="async"
          className="block size-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  )
}

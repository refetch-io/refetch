import { useState } from 'react'
import { getFaviconUrl } from '@/lib/appwrite-web'
import { cn } from '@/lib/utils'

interface FaviconProps {
  domain: string
  size?: number
  className?: string
}

export function Favicon({ domain, size = 16, className }: FaviconProps) {
  const [failed, setFailed] = useState(false)
  const src = failed ? '' : getFaviconUrl(domain)

  if (!src) {
    return (
      <div
        className={cn('rounded bg-gray-200', className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={cn('rounded', className)}
      onError={() => setFailed(true)}
    />
  )
}

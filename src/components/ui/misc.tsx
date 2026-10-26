import * as React from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('skeleton rounded-md', className)} {...props} />
}

export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-separator-strong bg-surface px-1 font-sans text-[11px] font-medium text-label-secondary',
        className,
      )}
      {...props}
    />
  )
}

export function Separator({ className, vertical }: { className?: string; vertical?: boolean }) {
  return (
    <div
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      className={cn('shrink-0 bg-separator', vertical ? 'h-full w-px' : 'h-px w-full', className)}
    />
  )
}

/** Dot separator used in meta rows: `domain · 3h ago · author`. */
export function Dot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('text-label-quaternary', className)}>
      ·
    </span>
  )
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      {icon && (
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-tint text-brand-text [&_svg]:size-6">
          {icon}
        </div>
      )}
      <h3 className="text-headline text-label">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-subhead text-balance text-label-secondary">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

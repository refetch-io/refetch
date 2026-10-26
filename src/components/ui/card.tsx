import * as React from 'react'
import { cn } from '@/lib/utils'

/** A rounded surface on the grouped background — the basic building block. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card bg-surface shadow-card squircle', className)} {...props} />
}

/** Small uppercase section label used above cards and inside widgets. */
export function SectionLabel({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'px-1 text-caption-1 font-semibold tracking-[0.06em] text-label-tertiary uppercase',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Inset grouped list (think iOS Settings): rows share one card and are split
 * by hairlines that start at the content edge. Set `--list-inset` on the list
 * to align separators with the row's text.
 */
export function List({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      role="list"
      className={cn('overflow-hidden rounded-card bg-surface shadow-card squircle', className)}
      {...props}
    />
  )
}

export function ListItem({ className, ...props }: React.LiHTMLAttributes<HTMLLIElement>) {
  return (
    <li
      className={cn(
        'relative',
        "not-first:before:pointer-events-none not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-[var(--list-inset,1.25rem)] not-first:before:h-px not-first:before:bg-separator not-first:before:content-['']",
        className,
      )}
      {...props}
    />
  )
}

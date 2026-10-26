import * as React from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  htmlFor: string
  hint?: React.ReactNode
  error?: string | null
  /** Rendered at the end of the label row (e.g. a character counter). */
  aside?: React.ReactNode
  optional?: boolean
  className?: string
  children: React.ReactNode
}

/** Label + control + hint/error, with consistent spacing and a11y wiring. */
export function Field({ label, htmlFor, hint, error, aside, optional, className, children }: FieldProps) {
  const describedBy = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined
  const child = React.isValidElement<Record<string, unknown>>(children)
    ? React.cloneElement(children, {
        id: htmlFor,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })
    : children

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <label htmlFor={htmlFor} className="text-footnote font-semibold text-label-secondary">
          {label}
          {optional && <span className="ml-1 font-normal text-label-tertiary">Optional</span>}
        </label>
        {aside}
      </div>
      {child}
      {error ? (
        <p id={`${htmlFor}-error`} className="flex items-center gap-1.5 px-1 text-footnote text-down">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="px-1 text-footnote text-label-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** Inline banner for form-level messages. */
export function Callout({
  tone = 'danger',
  icon,
  className,
  children,
}: {
  tone?: 'danger' | 'info' | 'success' | 'warning'
  icon?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  const tones = {
    danger: 'bg-down-tint text-down',
    info: 'bg-brand-tint text-brand-text',
    success: 'bg-up-tint text-up',
    warning: 'bg-warning-tint text-warning',
  }
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-control px-3.5 py-3 text-footnote font-medium',
        tones[tone],
        className,
      )}
    >
      {icon ?? <CircleAlert className="mt-px size-4 shrink-0" aria-hidden />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

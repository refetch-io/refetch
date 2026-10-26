import * as React from 'react'
import { cn } from '@/lib/utils'

const controlBase = [
  'w-full rounded-control bg-fill-secondary px-3.5 text-callout text-label placeholder:text-label-tertiary',
  'border border-transparent outline-none transition-[background-color,border-color,box-shadow] duration-200 ease-apple',
  'hover:bg-fill',
  'focus:border-brand/40 focus:bg-surface focus:shadow-[0_0_0_4px_var(--brand-tint)]',
  'aria-invalid:border-down/60 aria-invalid:focus:shadow-[0_0_0_4px_var(--down-tint)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

export function Input({
  className,
  ref,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cn(controlBase, 'h-11', className)} {...props} />
}

/** Textarea that grows with its content (up to `maxRows`). */
export function Textarea({
  className,
  maxRows = 10,
  ref,
  onInput,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  maxRows?: number
  ref?: React.Ref<HTMLTextAreaElement>
}) {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

  const resize = React.useCallback(() => {
    const el = innerRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 22
    const max = lineHeight * maxRows + 24
    el.style.height = `${Math.min(el.scrollHeight + 2, max)}px`
    el.style.overflowY = el.scrollHeight + 2 > max ? 'auto' : 'hidden'
  }, [maxRows])

  React.useLayoutEffect(resize, [resize, props.value])

  return (
    <textarea
      ref={(node) => {
        innerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      rows={props.rows ?? 3}
      onInput={(event) => {
        resize()
        onInput?.(event)
      }}
      className={cn(controlBase, 'resize-none py-3 leading-[1.45]', className)}
      {...props}
    />
  )
}

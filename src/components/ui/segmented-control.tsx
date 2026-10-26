import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SegmentOption<T extends string> {
  value: T
  label: React.ReactNode
  /** Accessible name when `label` is not plain text. */
  ariaLabel?: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: ReadonlyArray<SegmentOption<T>>
  size?: 'sm' | 'md'
  className?: string
  'aria-label': string
}

/**
 * iOS-style segmented control: equal-width segments with a sliding thumb.
 * Implements the radio-group keyboard pattern (arrow keys move selection).
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  size = 'md',
  className,
  ...props
}: SegmentedControlProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const refs = React.useRef<Array<HTMLButtonElement | null>>([])

  const select = (next: number) => {
    const option = options[(next + options.length) % options.length]
    onValueChange(option.value)
    refs.current[(next + options.length) % options.length]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={props['aria-label']}
      className={cn(
        'relative grid rounded-[10px] bg-fill p-0.5',
        size === 'sm' ? 'h-7 text-caption-1' : 'h-8 text-footnote',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault()
          select(index + 1)
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault()
          select(index - 1)
        }
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0.5 left-0.5 rounded-[8px] bg-(--thumb) shadow-(--thumb-shadow) transition-transform duration-[380ms] ease-spring"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(calc(${index} * 100%))`,
        }}
      />
      {options.map((option, i) => {
        const selected = i === index
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[i] = node
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'relative z-10 flex min-w-0 items-center justify-center gap-1 truncate rounded-[8px] px-2.5 font-medium transition-colors duration-200',
              selected ? 'text-label' : 'text-label-secondary hover:text-label',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

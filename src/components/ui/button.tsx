import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Spinner } from './spinner'

/**
 * Buttons follow Apple's hierarchy: one `primary` (filled) action per view,
 * `secondary`/`tinted` for supporting actions and `plain` for inline ones.
 */
export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 pressable items-center justify-center gap-1.5 font-semibold whitespace-nowrap select-none',
    'disabled:pointer-events-none disabled:opacity-45',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-brand text-on-brand hover:bg-brand-hover hover:shadow-brand active:bg-brand-pressed',
        secondary: 'bg-fill text-label hover:bg-fill-strong',
        tinted: 'bg-brand-tint text-brand-text hover:bg-brand-tint-strong',
        plain: 'text-brand-text hover:bg-brand-tint',
        ghost: 'text-label-secondary hover:bg-fill-secondary hover:text-label',
        outline: 'border border-separator-strong bg-surface text-label hover:bg-fill-secondary',
        destructive: 'bg-down-tint text-down hover:bg-down hover:text-white',
        dark: 'bg-label text-bg hover:opacity-90',
      },
      size: {
        xs: 'h-7 rounded-full px-2.5 text-caption-1 [&_svg]:size-3.5',
        sm: 'h-8 rounded-full px-3.5 text-footnote [&_svg]:size-4',
        md: 'h-9 rounded-full px-4 text-subhead [&_svg]:size-4',
        lg: 'h-11 rounded-full px-5 text-callout [&_svg]:size-[18px]',
        xl: 'h-12 rounded-control px-6 text-headline [&_svg]:size-5',
        'icon-xs': 'size-7 rounded-full [&_svg]:size-3.5',
        'icon-sm': 'size-8 rounded-full [&_svg]:size-4',
        icon: 'size-9 rounded-full [&_svg]:size-[18px]',
        'icon-lg': 'size-11 rounded-full [&_svg]:size-5',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ref,
  ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
  const classes = cn(buttonVariants({ variant, size }), className)

  if (asChild) {
    return (
      <Slot.Root ref={ref} className={classes} {...props}>
        {children}
      </Slot.Root>
    )
  }

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="invisible inline-flex items-center gap-1.5">{children}</span>
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner className="size-[1.1em]" />
          </span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1 rounded-full leading-none font-semibold whitespace-nowrap [&_svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'bg-fill text-label-secondary',
        brand: 'bg-brand-tint text-brand-text',
        solid: 'bg-brand text-on-brand',
        success: 'bg-up-tint text-up',
        danger: 'bg-down-tint text-down',
        outline: 'border border-separator-strong text-label-secondary',
      },
      size: {
        xs: 'h-[18px] px-1.5 text-[10px] tracking-[0.02em]',
        sm: 'h-5 px-2 text-caption-2',
        md: 'h-6 px-2.5 text-caption-1',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'sm' },
  },
)

export function Badge({
  className,
  variant,
  size,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

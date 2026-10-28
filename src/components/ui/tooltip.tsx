import * as React from 'react'
import { Tooltip as TooltipPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={400} skipDelayDuration={200}>
      {children}
    </TooltipPrimitive.Provider>
  )
}

interface TooltipProps {
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  children: React.ReactElement
  className?: string
  /** Controlled state, e.g. to also open on tap where hover doesn't exist. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Tooltip({ content, side = 'top', children, className, open, onOpenChange }: TooltipProps) {
  if (!content) return children
  return (
    <TooltipPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            'z-50 max-w-72 animate-scale-in rounded-[10px] px-2.5 py-1.5 text-footnote text-label',
            'glass-strong shadow-popover',
            className,
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

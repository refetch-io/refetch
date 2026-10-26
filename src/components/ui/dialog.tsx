import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

/**
 * Sheet-style dialog: frosted surface, title bar with a close button, a
 * scrolling body and an optional footer. Bottom sheet on phones.
 */
export function Dialog({ open, onOpenChange, title, description, children, footer, className }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-black/30 backdrop-blur-[2px] dark:bg-black/55" />
        <DialogPrimitive.Content
          // Radix expects a description; opt out explicitly when there isn't one.
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed z-50 flex max-h-[min(88dvh,720px)] flex-col overflow-hidden glass-strong shadow-popover',
            'inset-x-0 bottom-0 animate-rise-in rounded-t-[22px] pb-[env(safe-area-inset-bottom)]',
            'sm:inset-x-auto sm:top-[12vh] sm:bottom-auto sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-[30rem] sm:-translate-x-1/2 sm:animate-scale-in sm:rounded-[22px] sm:pb-0',
            className,
          )}
        >
          <div className="flex items-start gap-3 border-b border-separator px-5 pt-4 pb-3">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-headline text-label">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-0.5 text-footnote text-label-secondary">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="-mr-1.5 grid size-8 pressable place-items-center rounded-full bg-fill-secondary text-label-secondary hover:bg-fill hover:text-label"
            >
              <X className="size-4" strokeWidth={2.4} />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {footer && <div className="border-t border-separator px-5 py-3">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

import * as React from 'react'
import { AlertDialog } from 'radix-ui'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
}

/** Apple-style alert: centered sheet, title, message, stacked actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-black/30 backdrop-blur-[2px] dark:bg-black/55" />
        <AlertDialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[22rem] -translate-x-1/2 -translate-y-1/2',
            'animate-scale-in rounded-[22px] glass-strong p-5 text-center shadow-popover',
          )}
        >
          <AlertDialog.Title className="text-headline text-label">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-footnote text-label-secondary">
            {description}
          </AlertDialog.Description>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" size="lg" disabled={loading}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <Button
              variant={destructive ? 'destructive' : 'primary'}
              size="lg"
              loading={loading}
              onClick={onConfirm}
              className={destructive ? 'bg-down text-white hover:bg-down hover:brightness-110' : undefined}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

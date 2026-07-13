import { cn } from '@/lib/utils'

export function PresenceVisibilityToggle({
  enabled,
  disabled,
  onChange,
  className,
}: {
  enabled: boolean
  disabled?: boolean
  onChange: (enabled: boolean) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-grid w-full grid-cols-2 rounded-full bg-muted/80 p-0.5',
        className,
      )}
      role="group"
      aria-label="Presence visibility"
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={enabled}
        onClick={() => onChange(true)}
        className={cn(
          'inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-medium transition-all',
          enabled
            ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300'
            : 'text-muted-foreground hover:text-foreground',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        Online
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={!enabled}
        onClick={() => onChange(false)}
        className={cn(
          'inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-medium transition-all',
          !enabled
            ? 'bg-background text-foreground'
            : 'text-muted-foreground hover:text-foreground',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        Invisible
      </button>
    </div>
  )
}

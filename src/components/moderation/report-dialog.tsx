import * as React from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Check, Flag } from 'lucide-react'
import { toast } from 'sonner'
import { reportContent } from '@/api/moderation'
import { REPORT_NOTE_MAX, REPORT_REASONS, type ReportReason } from '@/lib/reports'
import { useSession } from '@/lib/session'
import type { ResourceType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Callout, Field } from '../ui/field'
import { Textarea } from '../ui/input'
import { Tooltip } from '../ui/tooltip'

export function ReportDialog({
  resourceType,
  resourceId,
  open,
  onOpenChange,
}: {
  resourceType: ResourceType
  resourceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const report = useServerFn(reportContent)
  const [reason, setReason] = React.useState<ReportReason | null>(null)
  const [note, setNote] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const noun = resourceType === 'post' ? 'story' : 'comment'

  React.useEffect(() => {
    if (!open) return
    setReason(null)
    setNote('')
    setError(null)
  }, [open])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!reason) return setError('Pick a reason.')
    setSending(true)
    setError(null)
    try {
      const result = await report({
        data: { resourceType, resourceId, reason, note: note.trim() || undefined },
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast.success('Thanks for reporting', { description: 'A moderator will take a look.' })
      onOpenChange(false)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Report this ${noun}`}
      description="Reports are private. Moderators review them and remove what breaks the rules."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="md" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="report-form"
            loading={sending}
            disabled={!reason}
          >
            Send report
          </Button>
        </div>
      }
    >
      <form id="report-form" onSubmit={(event) => void onSubmit(event)} className="space-y-5 px-5 py-5">
        {error && <Callout tone="danger">{error}</Callout>}
        <div role="radiogroup" aria-label="Reason" className="space-y-1.5">
          {REPORT_REASONS.map((option) => {
            const selected = reason === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setReason(option.value)}
                className={cn(
                  'flex h-11 w-full pressable items-center justify-between rounded-control px-3.5 text-left text-subhead transition-colors',
                  selected
                    ? 'bg-brand-tint font-semibold text-brand-text'
                    : 'bg-fill-secondary text-label hover:bg-fill',
                )}
              >
                {option.label}
                {selected && <Check className="size-4" strokeWidth={2.6} aria-hidden />}
              </button>
            )
          })}
        </div>
        <Field label="Anything else?" htmlFor="report-note" optional>
          <Textarea
            rows={2}
            maxRows={5}
            maxLength={REPORT_NOTE_MAX}
            placeholder="Context that helps a moderator decide"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
      </form>
    </Dialog>
  )
}

/** Flag button that opens the report dialog (or sign-in, for visitors). */
export function ReportButton({
  resourceType,
  resourceId,
  size = 'xs',
  className,
}: {
  resourceType: ResourceType
  resourceId: string
  size?: 'xs' | 'md'
  className?: string
}) {
  const { user } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = React.useState(false)
  const label = `Report ${resourceType === 'post' ? 'story' : 'comment'}`

  const onClick = () => {
    if (!user) return void navigate({ to: '/signin', search: { redirect: location.href } })
    setOpen(true)
  }

  return (
    <>
      <Tooltip content={label}>
        <Button
          variant="ghost"
          size={size === 'xs' ? 'icon-xs' : 'icon'}
          aria-label={label}
          data-kb-action="report"
          onClick={onClick}
          className={cn('text-label-tertiary', className)}
        >
          <Flag />
        </Button>
      </Tooltip>
      {user && (
        <ReportDialog
          resourceType={resourceType}
          resourceId={resourceId}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  )
}

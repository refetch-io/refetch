import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { createConversation } from '@/api/messages'
import { LIMITS, MAX_GROUP_MEMBERS } from '@/lib/constants'
import type { PersonSummary } from '@/lib/types'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Callout, Field } from '../ui/field'
import { Input } from '../ui/input'
import { PeoplePicker } from './parts'

/** Pick one person for a direct message, or several (plus an optional name) for a group. */
export function NewMessageDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [people, setPeople] = React.useState<Array<PersonSummary>>([])
  const [name, setName] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const start = useServerFn(createConversation)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const group = people.length > 1

  React.useEffect(() => {
    if (open) return
    setPeople([])
    setName('')
    setError(null)
  }, [open])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await start({
        data: { userIds: people.map((person) => person.id), name: group ? name.trim() : undefined },
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      await queryClient.invalidateQueries({ queryKey: ['inbox'] })
      onOpenChange(false)
      await navigate({ to: '/messages/$conversationId', params: { conversationId: result.data.id } })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New message"
      description="Message one person, or pick a few to start a group."
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption-1 text-label-tertiary tabular">
            {group ? `Group of ${people.length + 1}` : people.length === 1 ? 'Direct message' : ' '}
          </p>
          <Button
            variant="primary"
            size="md"
            disabled={people.length === 0}
            loading={busy}
            onClick={() => void submit()}
          >
            {group ? 'Start group' : 'Start chat'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 px-5 py-4">
        {error && <Callout tone="danger">{error}</Callout>}
        <PeoplePicker selected={people} onChange={setPeople} max={MAX_GROUP_MEMBERS - 1} autoFocus />
        {group && (
          <Field label="Group name" htmlFor="group-name" optional>
            <Input
              value={name}
              maxLength={LIMITS.groupNameMax}
              placeholder="Rustaceans, Launch crew…"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
        )}
      </div>
    </Dialog>
  )
}

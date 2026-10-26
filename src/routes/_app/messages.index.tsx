import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { MessageCirclePlus, MessagesSquare } from 'lucide-react'
import { NewMessageDialog } from '@/components/messages/new-message-dialog'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_app/messages/')({
  component: NoConversation,
})

function NoConversation() {
  const [composing, setComposing] = React.useState(false)
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div className="max-w-xs">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-tint text-brand-text">
          <MessagesSquare className="size-7" />
        </span>
        <h2 className="mt-4 text-title-3 text-label">Your messages</h2>
        <p className="mt-1.5 text-subhead text-label-secondary">
          Talk one on one or in groups, and share stories without leaving Refetch.
        </p>
        <Button variant="primary" size="md" className="mt-5" onClick={() => setComposing(true)}>
          <MessageCirclePlus />
          New message
        </Button>
      </div>
      <NewMessageDialog open={composing} onOpenChange={setComposing} />
    </div>
  )
}

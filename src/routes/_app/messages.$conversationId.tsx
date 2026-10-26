import { Link, createFileRoute } from '@tanstack/react-router'
import { MessagesSquare } from 'lucide-react'
import { conversationQuery } from '@/lib/queries'
import { ConversationView } from '@/components/messages/conversation-view'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/misc'

export const Route = createFileRoute('/_app/messages/$conversationId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(conversationQuery(params.conversationId, context.user.id)),
  pendingComponent: () => (
    <div className="grid h-full place-items-center">
      <Spinner className="size-5 text-label-tertiary" />
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid h-full place-items-center">
      <EmptyState
        icon={<MessagesSquare />}
        title="Conversation not found"
        description="It may have been deleted, or you’re no longer part of it."
        action={
          <Button asChild variant="secondary" size="md">
            <Link to="/messages">All messages</Link>
          </Button>
        }
      />
    </div>
  ),
  component: ConversationPage,
})

function ConversationPage() {
  const { conversationId } = Route.useParams()
  const { user } = Route.useRouteContext()
  return <ConversationView conversationId={conversationId} userId={user.id} />
}

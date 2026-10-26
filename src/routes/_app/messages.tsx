import { Outlet, createFileRoute, redirect, useRouterState } from '@tanstack/react-router'
import { inboxQuery } from '@/lib/queries'
import { seo } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { ConversationList } from '@/components/messages/conversation-list'

export const Route = createFileRoute('/_app/messages')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: '/signin', search: { redirect: location.href } })
    return { user: context.user }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(inboxQuery(context.user.id)),
  head: () => ({ meta: seo({ title: 'Messages - Refetch', noindex: true }) }),
  component: MessagesLayout,
})

/** Inbox and conversation side by side; one at a time on phones. */
function MessagesLayout() {
  const { user } = Route.useRouteContext()
  const inConversation = useRouterState({
    select: (state) => /^\/messages\/[^/]+/.test(state.location.pathname),
  })

  return (
    <div className="-mx-4 h-[calc(100dvh-52px)] lg:mx-0 lg:h-[calc(100dvh-52px-3rem)]">
      <div className="grid h-full overflow-hidden bg-surface lg:grid-cols-[340px_minmax(0,1fr)] lg:rounded-card lg:shadow-card">
        <ConversationList
          userId={user.id}
          className={cn('lg:border-r lg:border-separator', inConversation && 'max-lg:hidden')}
        />
        <div className={cn('min-h-0', !inConversation && 'max-lg:hidden')}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

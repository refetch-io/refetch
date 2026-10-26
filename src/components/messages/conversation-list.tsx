import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { BellOff, MessageCirclePlus, MessagesSquare, Search } from 'lucide-react'
import { inboxQuery } from '@/lib/queries'
import type { ConversationSummary } from '@/lib/types'
import { cn, timeAgo } from '@/lib/utils'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { EmptyState, Skeleton } from '../ui/misc'
import { Tooltip } from '../ui/tooltip'
import { NewMessageDialog } from './new-message-dialog'
import { ConversationAvatar, UnreadBadge } from './parts'

export function ConversationList({ userId, className }: { userId: string; className?: string }) {
  const { data: inbox, isPending } = useQuery(inboxQuery(userId))
  const params = useParams({ strict: false }) as { conversationId?: string }
  const [composing, setComposing] = React.useState(false)
  const [filter, setFilter] = React.useState('')

  const term = filter.trim().toLowerCase()
  const conversations = (inbox?.conversations ?? []).filter(
    (conversation) =>
      !term ||
      conversation.title.toLowerCase().includes(term) ||
      conversation.members.some((member) => member.name.toLowerCase().includes(term)),
  )

  return (
    <section aria-label="Conversations" className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <h1 className="text-title-2 text-label">Messages</h1>
        <Tooltip content="New message" side="bottom">
          <Button variant="tinted" size="icon-sm" aria-label="New message" onClick={() => setComposing(true)}>
            <MessageCirclePlus />
          </Button>
        </Tooltip>
      </div>
      {(inbox?.conversations.length ?? 0) > 4 && (
        <div className="px-4 pb-3">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-label-tertiary"
            />
            <Input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
              className="h-9 pl-9 text-subhead"
            />
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        {isPending ? (
          <ul aria-hidden className="space-y-1">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-2 py-2.5">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-28 rounded-full" />
                  <Skeleton className="h-3 w-44 rounded-full" />
                </div>
              </li>
            ))}
          </ul>
        ) : conversations.length === 0 ? (
          term ? (
            <p className="px-3 py-8 text-center text-footnote text-label-secondary">
              No conversations match.
            </p>
          ) : (
            <EmptyState
              icon={<MessagesSquare />}
              title="No messages yet"
              description="Start a conversation with someone, or a group around a topic."
              action={
                <Button variant="primary" size="md" onClick={() => setComposing(true)}>
                  <MessageCirclePlus />
                  New message
                </Button>
              }
            />
          )
        ) : (
          <ul role="list" className="space-y-0.5">
            {conversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                userId={userId}
                active={params.conversationId === conversation.id}
              />
            ))}
          </ul>
        )}
      </div>
      <NewMessageDialog open={composing} onOpenChange={setComposing} />
    </section>
  )
}

function ConversationRow({
  conversation,
  userId,
  active,
}: {
  conversation: ConversationSummary
  userId: string
  active: boolean
}) {
  const last = conversation.lastMessage
  const unread = conversation.unread > 0 && !active
  const author =
    last && conversation.type === 'group' && last.userId !== userId
      ? conversation.members.find((member) => member.id === last.userId)?.name.split(' ')[0]
      : null

  return (
    <li>
      <Link
        to="/messages/$conversationId"
        params={{ conversationId: conversation.id }}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-[14px] px-2.5 py-2.5 transition-colors',
          active ? 'bg-brand-tint' : 'hover:bg-fill-secondary',
        )}
      >
        <ConversationAvatar conversation={conversation} viewerId={userId} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-subhead text-label',
                unread ? 'font-bold' : 'font-semibold',
              )}
            >
              {conversation.title}
            </span>
            {last && (
              <time
                dateTime={last.at}
                className={cn(
                  'shrink-0 text-caption-1 tabular',
                  unread ? 'font-semibold text-brand-text' : 'text-label-tertiary',
                )}
              >
                {timeAgo(last.at)}
              </time>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-footnote',
                unread ? 'font-medium text-label' : 'text-label-secondary',
              )}
            >
              {last
                ? `${last.userId === userId ? 'You: ' : author ? `${author}: ` : ''}${last.preview || 'Message deleted'}`
                : conversation.type === 'group'
                  ? `${conversation.members.length} people`
                  : 'Say hello'}
            </span>
            {conversation.muted && (
              <BellOff className="size-3.5 shrink-0 text-label-tertiary" aria-label="Muted" />
            )}
            {unread && !conversation.muted && <UnreadBadge count={conversation.unread} />}
          </span>
        </span>
      </Link>
    </li>
  )
}

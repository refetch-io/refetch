import * as React from 'react'
import { useInfiniteQuery, useQueryClient, useSuspenseQuery, type InfiniteData } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  ArrowUp,
  Bell,
  BellOff,
  ChevronLeft,
  CornerUpLeft,
  Ellipsis,
  LogOut,
  MessageCircle,
  Pencil,
  SmilePlus,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  addGroupMembers,
  leaveGroup,
  muteConversation,
  postMessage,
  reactToMessage,
  readConversation,
  removeGroupMember,
  removeMessage,
  renameGroup,
  updateMessage,
} from '@/api/messages'
import { LIMITS, MAX_GROUP_MEMBERS, MESSAGE_REACTIONS } from '@/lib/constants'
import { conversationQuery, messagesQuery } from '@/lib/queries'
import type { ConversationDetail, Message, MessagePage, PersonSummary } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Favicon } from '../favicon'
import { RichText } from '../rich-text'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Dialog } from '../ui/dialog'
import { Field } from '../ui/field'
import { Input, Textarea } from '../ui/input'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '../ui/menu'
import { Spinner } from '../ui/spinner'
import { ConversationAvatar, PeoplePicker } from './parts'

/** Messages from the same person within this window stack without repeating the name. */
const GROUP_WINDOW_MS = 5 * 60_000

type Pages = InfiniteData<MessagePage, string | undefined>

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function dayLabel(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86_400_000)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  })
}

function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function ConversationView({ conversationId, userId }: { conversationId: string; userId: string }) {
  const { data: detail } = useSuspenseQuery(conversationQuery(conversationId, userId))
  const messages = useInfiniteQuery(messagesQuery(conversationId, userId))
  const queryClient = useQueryClient()
  const read = useServerFn(readConversation)
  const [replyTo, setReplyTo] = React.useState<Message | null>(null)
  const [editing, setEditing] = React.useState<Message | null>(null)

  const ordered = React.useMemo(
    () => [...(messages.data?.pages ?? [])].reverse().flatMap((page) => page.messages),
    [messages.data],
  )
  const people = React.useMemo(
    () => new Map<string, PersonSummary>(detail.members.map((member) => [member.id, member])),
    [detail.members],
  )
  const newest = ordered[ordered.length - 1]

  // Mark as read when opened and whenever someone else's message arrives.
  React.useEffect(() => {
    if (!newest || document.visibilityState !== 'visible') return
    const me = detail.members.find((member) => member.id === userId)
    if (me?.lastReadAt && me.lastReadAt >= newest.createdAt && detail.conversation.unread === 0) return
    void read({ data: { conversationId } }).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['unread'] })
      void queryClient.invalidateQueries({ queryKey: ['inbox'] })
    })
  }, [newest?.id, conversationId]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    setReplyTo(null)
    setEditing(null)
  }, [conversationId])

  const insert = (message: Message) => {
    queryClient.setQueryData<Pages>(messagesQuery(conversationId, userId).queryKey, (data) => {
      if (!data) return data
      const [first, ...rest] = data.pages
      if (first.messages.some((item) => item.id === message.id)) return data
      return { ...data, pages: [{ ...first, messages: [...first.messages, message] }, ...rest] }
    })
  }

  return (
    <section aria-label={detail.conversation.title} className="flex h-full min-h-0 flex-col">
      <ConversationHeader detail={detail} userId={userId} />
      <MessageList
        detail={detail}
        userId={userId}
        people={people}
        messages={ordered}
        loading={messages.isPending}
        hasOlder={Boolean(messages.hasNextPage)}
        loadingOlder={messages.isFetchingNextPage}
        onLoadOlder={() => void messages.fetchNextPage()}
        onReply={(message) => {
          setEditing(null)
          setReplyTo(message)
        }}
        onEdit={(message) => {
          setReplyTo(null)
          setEditing(message)
        }}
      />
      {detail.readOnlyReason ? (
        <p className="border-t border-separator px-4 py-4 text-center text-footnote text-label-secondary">
          {detail.readOnlyReason}
        </p>
      ) : (
        <Composer
          key={conversationId}
          conversationId={conversationId}
          people={people}
          replyTo={replyTo}
          editing={editing}
          onDone={() => {
            setReplyTo(null)
            setEditing(null)
          }}
          onSent={insert}
        />
      )}
    </section>
  )
}

/* ─────────────────────────────────── Header ─────────────────────────────────── */

function ConversationHeader({ detail, userId }: { detail: ConversationDetail; userId: string }) {
  const { conversation } = detail
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const mute = useServerFn(muteConversation)
  const leave = useServerFn(leaveGroup)
  const [dialog, setDialog] = React.useState<'members' | 'rename' | 'add' | 'leave' | null>(null)
  const other = conversation.members.find((member) => member.id !== userId)
  const group = conversation.type === 'group'

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['conversation', conversation.id] }),
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] }),
      queryClient.invalidateQueries({ queryKey: ['inbox'] }),
      queryClient.invalidateQueries({ queryKey: ['unread'] }),
    ])

  const toggleMute = async () => {
    const result = await mute({ data: { conversationId: conversation.id, muted: !conversation.muted } })
    if (!result.ok) return toast.error(result.error)
    toast.success(conversation.muted ? 'Notifications on' : 'Muted', {
      description: conversation.muted ? undefined : 'Unread counts from this conversation are hidden.',
    })
    await refresh()
  }

  const onLeave = async () => {
    const result = await leave({ data: { conversationId: conversation.id } })
    if (!result.ok) return toast.error(result.error)
    setDialog(null)
    await queryClient.invalidateQueries({ queryKey: ['inbox'] })
    await navigate({ to: '/messages' })
  }

  return (
    <header className="flex items-center gap-3 border-b border-separator px-3 py-2.5 sm:px-4">
      <Button asChild variant="ghost" size="icon-sm" className="lg:hidden" aria-label="All messages">
        <Link to="/messages">
          <ChevronLeft />
        </Link>
      </Button>
      <ConversationAvatar conversation={conversation} viewerId={userId} size={36} />
      <div className="min-w-0 flex-1">
        {group ? (
          <button type="button" onClick={() => setDialog('members')} className="block max-w-full text-left">
            <p className="truncate text-headline text-label">{conversation.title}</p>
            <p className="truncate text-caption-1 text-label-secondary">
              {conversation.members.length} people
            </p>
          </button>
        ) : (
          <Link to="/users/$userId" params={{ userId: other?.id ?? userId }} className="block max-w-full">
            <p className="truncate text-headline text-label hover:text-brand-text">{conversation.title}</p>
            <p className="truncate text-caption-1 text-label-secondary">View profile</p>
          </Link>
        )}
      </div>
      {conversation.muted && <BellOff className="size-4 text-label-tertiary" aria-label="Muted" />}
      <Menu>
        <MenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Conversation options">
            <Ellipsis />
          </Button>
        </MenuTrigger>
        <MenuContent align="end" className="w-56">
          <MenuItem onSelect={() => void toggleMute()}>
            {conversation.muted ? <Bell /> : <BellOff />}
            {conversation.muted ? 'Unmute' : 'Mute'}
          </MenuItem>
          {group ? (
            <>
              <MenuItem onSelect={() => setDialog('members')}>
                <Users />
                People
              </MenuItem>
              <MenuItem onSelect={() => setDialog('add')}>
                <UserPlus />
                Add people
              </MenuItem>
              <MenuItem onSelect={() => setDialog('rename')}>
                <Pencil />
                Rename group
              </MenuItem>
              <MenuSeparator />
              <MenuItem destructive onSelect={() => setDialog('leave')}>
                <LogOut className="!text-current" />
                Leave group
              </MenuItem>
            </>
          ) : (
            other && (
              <MenuItem asChild>
                <Link to="/users/$userId" params={{ userId: other.id }}>
                  <Users />
                  Profile, block or report
                </Link>
              </MenuItem>
            )
          )}
        </MenuContent>
      </Menu>

      {group && (
        <>
          <MembersDialog
            detail={detail}
            userId={userId}
            open={dialog === 'members'}
            onOpenChange={(open) => setDialog(open ? 'members' : null)}
            onAdd={() => setDialog('add')}
            onChanged={refresh}
          />
          <AddPeopleDialog
            detail={detail}
            open={dialog === 'add'}
            onOpenChange={(open) => setDialog(open ? 'add' : null)}
            onChanged={refresh}
          />
          <RenameDialog
            detail={detail}
            open={dialog === 'rename'}
            onOpenChange={(open) => setDialog(open ? 'rename' : null)}
            onChanged={refresh}
          />
          <ConfirmDialog
            open={dialog === 'leave'}
            onOpenChange={(open) => setDialog(open ? 'leave' : null)}
            title="Leave this group?"
            description="You’ll stop getting its messages. Someone in the group can add you back."
            confirmLabel="Leave"
            destructive
            onConfirm={() => void onLeave()}
          />
        </>
      )}
    </header>
  )
}

function MembersDialog({
  detail,
  userId,
  open,
  onOpenChange,
  onAdd,
  onChanged,
}: {
  detail: ConversationDetail
  userId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: () => void
  onChanged: () => Promise<unknown>
}) {
  const remove = useServerFn(removeGroupMember)
  const isOwner = detail.role === 'owner'
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${detail.members.length} people`}
      footer={
        detail.members.length < MAX_GROUP_MEMBERS && (
          <Button variant="secondary" size="md" className="w-full" onClick={onAdd}>
            <UserPlus />
            Add people
          </Button>
        )
      }
    >
      <ul role="list" className="px-3 py-2">
        {detail.members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Link
              to="/users/$userId"
              params={{ userId: member.id }}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <Avatar name={member.name} userId={member.id} size={36} />
              <span className="min-w-0">
                <span className="block truncate text-subhead font-semibold text-label">
                  {member.name}
                  {member.id === userId && <span className="font-normal text-label-tertiary"> (you)</span>}
                </span>
                {member.role === 'owner' && (
                  <span className="text-caption-1 text-label-secondary">Owner</span>
                )}
              </span>
            </Link>
            {isOwner && member.id !== userId && (
              <Button
                variant="ghost"
                size="xs"
                onClick={async () => {
                  const result = await remove({
                    data: { conversationId: detail.conversation.id, userId: member.id },
                  })
                  if (!result.ok) return toast.error(result.error)
                  toast.success(`Removed ${member.name}`)
                  await onChanged()
                }}
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Dialog>
  )
}

function AddPeopleDialog({
  detail,
  open,
  onOpenChange,
  onChanged,
}: {
  detail: ConversationDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => Promise<unknown>
}) {
  const add = useServerFn(addGroupMembers)
  const [people, setPeople] = React.useState<Array<PersonSummary>>([])
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    if (!open) setPeople([])
  }, [open])

  const submit = async () => {
    setBusy(true)
    try {
      const result = await add({
        data: { conversationId: detail.conversation.id, userIds: people.map((person) => person.id) },
      })
      if (!result.ok) return toast.error(result.error)
      await onChanged()
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add people"
      description="New people can see the conversation’s history."
      footer={
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="md"
            disabled={people.length === 0}
            loading={busy}
            onClick={() => void submit()}
          >
            Add {people.length > 0 ? people.length : ''}
          </Button>
        </div>
      }
    >
      <div className="px-5 py-4">
        <PeoplePicker
          selected={people}
          onChange={setPeople}
          exclude={detail.members.map((member) => member.id)}
          max={MAX_GROUP_MEMBERS - detail.members.length}
          autoFocus
        />
      </div>
    </Dialog>
  )
}

function RenameDialog({
  detail,
  open,
  onOpenChange,
  onChanged,
}: {
  detail: ConversationDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => Promise<unknown>
}) {
  const rename = useServerFn(renameGroup)
  const [name, setName] = React.useState(detail.conversation.name ?? '')
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    if (open) setName(detail.conversation.name ?? '')
  }, [open, detail.conversation.name])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await rename({ data: { conversationId: detail.conversation.id, name } })
      if (!result.ok) return toast.error(result.error)
      await onChanged()
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rename group"
      footer={
        <div className="flex justify-end">
          <Button variant="primary" size="md" type="submit" form="rename-group" loading={busy}>
            Save
          </Button>
        </div>
      }
    >
      <form id="rename-group" onSubmit={(event) => void submit(event)} className="px-5 py-4">
        <Field label="Group name" htmlFor="rename-group-name" hint="Leave empty to show everyone’s names.">
          <Input
            value={name}
            maxLength={LIMITS.groupNameMax}
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </form>
    </Dialog>
  )
}

/* ─────────────────────────────────── Messages ─────────────────────────────────── */

function MessageList({
  detail,
  userId,
  people,
  messages,
  loading,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  onReply,
  onEdit,
}: {
  detail: ConversationDetail
  userId: string
  people: Map<string, PersonSummary>
  messages: Array<Message>
  loading: boolean
  hasOlder: boolean
  loadingOlder: boolean
  onLoadOlder: () => void
  onReply: (message: Message) => void
  onEdit: (message: Message) => void
}) {
  const scroller = React.useRef<HTMLDivElement>(null)
  const pinned = React.useRef(true)
  const previous = React.useRef<{ first?: string; last?: string; height: number }>({ height: 0 })

  // Stay pinned to the newest message unless the reader scrolled up; keep the
  // reading position when older messages load above.
  React.useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const first = messages[0]?.id
    const last = messages[messages.length - 1]?.id
    if (previous.current.first && first !== previous.current.first && last === previous.current.last) {
      el.scrollTop += el.scrollHeight - previous.current.height
    } else if (pinned.current || messages[messages.length - 1]?.userId === userId) {
      el.scrollTop = el.scrollHeight
    }
    previous.current = { first, last, height: el.scrollHeight }
  }, [messages, userId])

  const lastOwn = [...messages]
    .reverse()
    .find((message) => message.userId === userId && message.kind === 'text')
  const readers = lastOwn
    ? detail.members.filter(
        (member) => member.id !== userId && member.lastReadAt && member.lastReadAt >= lastOwn.createdAt,
      )
    : []

  return (
    <div
      ref={scroller}
      onScroll={(event) => {
        const el = event.currentTarget
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      }}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5"
      role="log"
      aria-live="polite"
      aria-label="Messages"
    >
      {loading ? (
        <div className="grid h-full place-items-center">
          <Spinner className="size-5 text-label-tertiary" />
        </div>
      ) : messages.length === 0 ? (
        <div className="grid h-full place-items-center text-center">
          <div>
            <MessageCircle className="mx-auto size-8 text-label-quaternary" aria-hidden />
            <p className="mt-2 text-subhead text-label-secondary">No messages yet. Say hello.</p>
          </div>
        </div>
      ) : (
        <>
          {hasOlder && (
            <div className="mb-4 text-center">
              <Button variant="secondary" size="xs" loading={loadingOlder} onClick={onLoadOlder}>
                Load earlier messages
              </Button>
            </div>
          )}
          <ol className="space-y-0.5">
            {messages.map((message, index) => {
              const prev = messages[index - 1]
              const newDay = !prev || !sameDay(prev.createdAt, message.createdAt)
              const stacked =
                !newDay &&
                prev?.kind === 'text' &&
                prev.userId === message.userId &&
                new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS
              return (
                <React.Fragment key={message.id}>
                  {newDay && (
                    <li className="py-3 text-center text-caption-1 font-semibold text-label-tertiary">
                      {dayLabel(message.createdAt)}
                    </li>
                  )}
                  {message.kind === 'system' ? (
                    <li className="py-2 text-center text-caption-1 text-label-tertiary">{message.content}</li>
                  ) : (
                    <MessageBubble
                      message={message}
                      mine={message.userId === userId}
                      author={people.get(message.userId)}
                      people={people}
                      userId={userId}
                      showAuthor={detail.conversation.type === 'group' && !stacked}
                      stacked={stacked}
                      onReply={() => onReply(message)}
                      onEdit={() => onEdit(message)}
                    />
                  )}
                  {message.id === lastOwn?.id && (
                    <li className="pt-0.5 pr-1 text-right text-caption-2 text-label-tertiary">
                      {detail.conversation.type === 'direct'
                        ? readers.length > 0
                          ? 'Seen'
                          : 'Sent'
                        : readers.length > 0
                          ? `Seen by ${readers.length === detail.members.length - 1 ? 'everyone' : readers.map((r) => r.name.split(' ')[0]).join(', ')}`
                          : 'Sent'}
                    </li>
                  )}
                </React.Fragment>
              )
            })}
          </ol>
        </>
      )}
    </div>
  )
}

function MessageBubble({
  message,
  mine,
  author,
  people,
  userId,
  showAuthor,
  stacked,
  onReply,
  onEdit,
}: {
  message: Message
  mine: boolean
  author: PersonSummary | undefined
  people: Map<string, PersonSummary>
  userId: string
  showAuthor: boolean
  stacked: boolean
  onReply: () => void
  onEdit: () => void
}) {
  const queryClient = useQueryClient()
  const react = useServerFn(reactToMessage)
  const remove = useServerFn(removeMessage)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const name = author?.name ?? 'Someone'

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['messages'] })

  const toggleReaction = async (emoji: (typeof MESSAGE_REACTIONS)[number]) => {
    const result = await react({ data: { messageId: message.id, emoji } })
    if (!result.ok) return toast.error(result.error)
    await refresh()
  }

  const onDelete = async () => {
    const result = await remove({ data: { messageId: message.id } })
    if (!result.ok) return toast.error(result.error)
    setConfirmDelete(false)
    await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ['inbox'] })])
  }

  return (
    <li
      className={cn(
        'group/message flex items-end gap-2',
        mine ? 'flex-row-reverse' : 'flex-row',
        !stacked && 'mt-2.5',
      )}
    >
      {!mine && (
        <span className="w-8 shrink-0">
          {!stacked && (
            <Link to="/users/$userId" params={{ userId: message.userId }} aria-label={name}>
              <Avatar name={name} userId={message.userId} size={32} />
            </Link>
          )}
        </span>
      )}
      <div className={cn('flex max-w-[min(78%,34rem)] flex-col', mine ? 'items-end' : 'items-start')}>
        {showAuthor && !mine && (
          <p className="mb-0.5 px-3 text-caption-1 font-semibold text-label-secondary">{name}</p>
        )}
        {message.replyTo && (
          <div
            className={cn(
              'mb-[-6px] max-w-full truncate rounded-t-[14px] border-l-2 border-brand/50 bg-fill-secondary px-3 pt-1.5 pb-2.5 text-caption-1 text-label-secondary',
              mine ? 'mr-2' : 'ml-2',
            )}
          >
            <span className="font-semibold">
              {message.replyTo.userId === userId
                ? 'You'
                : (people.get(message.replyTo.userId)?.name ?? 'Someone')}
            </span>
            : {message.replyTo.deleted ? 'Message deleted' : message.replyTo.content}
          </div>
        )}
        <div className="relative flex items-center gap-1.5">
          <div
            className={cn(
              'relative min-w-0 rounded-[20px] px-3.5 py-2 text-subhead break-words outline-none',
              message.deleted
                ? 'border border-dashed border-separator-strong bg-transparent text-label-tertiary italic'
                : mine
                  ? 'bg-brand text-on-brand'
                  : 'bg-fill-secondary text-label',
              mine ? 'order-2 rounded-br-[6px]' : 'rounded-bl-[6px]',
            )}
            title={clockTime(message.createdAt)}
            // Focusable so a tap on phones reveals the actions row below.
            tabIndex={0}
          >
            {message.deleted ? (
              'Message deleted'
            ) : (
              <>
                {message.story && <StoryCard story={message.story} mine={mine} />}
                {message.content && (
                  <RichText
                    text={message.content}
                    className={cn(
                      'leading-[1.4] whitespace-pre-wrap',
                      message.story && 'mt-2',
                      mine && '[&_a]:text-on-brand [&_a]:underline',
                    )}
                  />
                )}
                {message.editedAt && (
                  <span
                    className={cn('ml-1.5 text-caption-2', mine ? 'text-on-brand/70' : 'text-label-tertiary')}
                  >
                    edited
                  </span>
                )}
              </>
            )}
          </div>

          {!message.deleted && (
            <div
              className={cn(
                'flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100 max-sm:hidden',
                mine ? 'order-1' : 'order-2',
              )}
            >
              <Menu>
                <MenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Add reaction"
                    className="grid size-7 place-items-center rounded-full text-label-tertiary hover:bg-fill-secondary hover:text-label"
                  >
                    <SmilePlus className="size-4" />
                  </button>
                </MenuTrigger>
                <MenuContent align={mine ? 'end' : 'start'} className="flex w-auto gap-0.5 p-1.5">
                  {MESSAGE_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => void toggleReaction(emoji)}
                      className="grid size-9 place-items-center rounded-xl text-[20px] hover:bg-fill-secondary"
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </MenuContent>
              </Menu>
              <button
                type="button"
                aria-label="Reply"
                onClick={onReply}
                className="grid size-7 place-items-center rounded-full text-label-tertiary hover:bg-fill-secondary hover:text-label"
              >
                <CornerUpLeft className="size-4" />
              </button>
              {mine && (
                <Menu>
                  <MenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="More"
                      className="grid size-7 place-items-center rounded-full text-label-tertiary hover:bg-fill-secondary hover:text-label"
                    >
                      <Ellipsis className="size-4" />
                    </button>
                  </MenuTrigger>
                  <MenuContent align="end" className="w-44">
                    <MenuItem onSelect={onEdit}>
                      <Pencil />
                      Edit
                    </MenuItem>
                    <MenuItem destructive onSelect={() => setConfirmDelete(true)}>
                      <Trash2 className="!text-current" />
                      Delete
                    </MenuItem>
                  </MenuContent>
                </Menu>
              )}
            </div>
          )}
        </div>

        {/* Phones have no hover: a compact row of actions under the bubble. */}
        {!message.deleted && (
          <div className="mt-0.5 hidden gap-3 px-1 text-caption-2 font-semibold text-label-tertiary group-focus-within/message:flex sm:!hidden">
            <button type="button" onClick={() => void toggleReaction('👍')}>
              👍
            </button>
            <button type="button" onClick={() => void toggleReaction('❤️')}>
              ❤️
            </button>
            <button type="button" onClick={onReply}>
              Reply
            </button>
            {mine && (
              <button type="button" onClick={onEdit}>
                Edit
              </button>
            )}
            {mine && (
              <button type="button" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            )}
          </div>
        )}

        {message.reactions.length > 0 && (
          <ul role="list" className={cn('mt-1 flex flex-wrap gap-1', mine ? 'justify-end' : 'justify-start')}>
            {message.reactions.map((reaction) => {
              const reacted = reaction.userIds.includes(userId)
              const names = reaction.userIds.map((id) =>
                id === userId ? 'You' : (people.get(id)?.name ?? 'Someone'),
              )
              return (
                <li key={reaction.emoji}>
                  <button
                    type="button"
                    title={names.join(', ')}
                    aria-pressed={reacted}
                    onClick={() => void toggleReaction(reaction.emoji as (typeof MESSAGE_REACTIONS)[number])}
                    className={cn(
                      'inline-flex h-6 items-center gap-1 rounded-full px-2 text-caption-1 tabular transition-colors',
                      reacted
                        ? 'bg-brand-tint font-semibold text-brand-text ring-1 ring-brand/30'
                        : 'bg-fill-secondary text-label-secondary',
                    )}
                  >
                    <span className="text-[13px]">{reaction.emoji}</span>
                    {reaction.userIds.length}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this message?"
        description="It’ll be replaced with “Message deleted” for everyone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void onDelete()}
      />
    </li>
  )
}

function StoryCard({ story, mine }: { story: NonNullable<Message['story']>; mine: boolean }) {
  return (
    <Link
      to="/threads/$threadId"
      params={{ threadId: story.id }}
      className={cn(
        'block rounded-[14px] p-2.5 transition-colors',
        mine ? 'bg-white/15 hover:bg-white/20' : 'bg-surface shadow-card hover:shadow-raised',
      )}
    >
      <span
        className={cn(
          'flex items-center gap-1.5 text-caption-2',
          mine ? 'text-on-brand/75' : 'text-label-tertiary',
        )}
      >
        <Favicon domain={story.domain} size={14} />
        {story.domain ?? 'refetch.io'}
      </span>
      <span
        className={cn('mt-1 line-clamp-2 text-subhead font-semibold', mine ? 'text-on-brand' : 'text-label')}
      >
        {story.title}
      </span>
      <span
        className={cn('mt-1 block text-caption-2 tabular', mine ? 'text-on-brand/75' : 'text-label-tertiary')}
      >
        ▲ {story.count} · {story.countComments} comments
      </span>
    </Link>
  )
}

/* ─────────────────────────────────── Composer ─────────────────────────────────── */

function Composer({
  conversationId,
  people,
  replyTo,
  editing,
  onDone,
  onSent,
}: {
  conversationId: string
  people: Map<string, PersonSummary>
  replyTo: Message | null
  editing: Message | null
  onDone: () => void
  onSent: (message: Message) => void
}) {
  const send = useServerFn(postMessage)
  const edit = useServerFn(updateMessage)
  const queryClient = useQueryClient()
  const [text, setText] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const input = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (editing) setText(editing.content)
    if (editing || replyTo) input.current?.focus()
  }, [editing, replyTo])

  const submit = async () => {
    const content = text.trim()
    if (!content || busy) return
    setBusy(true)
    try {
      if (editing) {
        const result = await edit({ data: { messageId: editing.id, content } })
        if (!result.ok) return toast.error(result.error)
        await queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      } else {
        const result = await send({ data: { conversationId, content, replyToId: replyTo?.id } })
        if (!result.ok) return toast.error(result.error)
        onSent(result.data)
      }
      setText('')
      onDone()
      void queryClient.invalidateQueries({ queryKey: ['inbox'] })
    } finally {
      setBusy(false)
      input.current?.focus()
    }
  }

  const context = editing ?? replyTo
  const near = text.length > LIMITS.messageMax - 300

  return (
    <div className="border-t border-separator px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      {context && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-fill-secondary px-3 py-1.5 text-caption-1 text-label-secondary">
          {editing ? (
            <Pencil className="size-3.5 shrink-0" />
          ) : (
            <CornerUpLeft className="size-3.5 shrink-0" />
          )}
          <span className="min-w-0 flex-1 truncate">
            {editing ? 'Editing message' : `Replying to ${people.get(context.userId)?.name ?? 'message'}`}
            {': '}
            <span className="text-label-tertiary">{context.content}</span>
          </span>
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => {
              if (editing) setText('')
              onDone()
            }}
            className="grid size-5 place-items-center rounded-full hover:bg-fill"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        className="flex items-end gap-2"
      >
        <Textarea
          ref={input}
          rows={1}
          maxRows={8}
          value={text}
          maxLength={LIMITS.messageMax}
          placeholder="Message"
          aria-label="Message"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              void submit()
            } else if (event.key === 'Escape' && context) {
              if (editing) setText('')
              onDone()
            }
          }}
          className="min-h-10 rounded-[20px] py-2"
        />
        <Button
          type="submit"
          variant="primary"
          size="icon"
          aria-label={editing ? 'Save edit' : 'Send'}
          disabled={!text.trim()}
          loading={busy}
          className="mb-0.5 shrink-0 rounded-full"
        >
          <ArrowUp strokeWidth={2.6} />
        </Button>
      </form>
      {near && (
        <p className="mt-1 text-right text-caption-2 text-label-tertiary tabular">
          {text.length}/{LIMITS.messageMax}
        </p>
      )}
    </div>
  )
}

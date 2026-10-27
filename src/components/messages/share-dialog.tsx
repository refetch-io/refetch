import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Check, Link2, Send, Share } from 'lucide-react'
import { toast } from 'sonner'
import { shareStoryInMessages } from '@/api/messages'
import { trackStoryShare } from '@/lib/analytics'
import { LIMITS } from '@/lib/constants'
import { inboxQuery } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { copyToClipboard, shareLink } from '@/lib/share'
import type { PersonSummary } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Textarea } from '../ui/input'
import { ConversationAvatar, PeoplePicker } from './parts'

const MAX_TARGETS = 10

/** Send a story to conversations or people on Refetch, or share it elsewhere. */
export function ShareDialog({
  post,
  url,
  open,
  onOpenChange,
}: {
  post: { id: string; title: string }
  url: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const share = useServerFn(shareStoryInMessages)
  const { data: inbox } = useQuery({ ...inboxQuery(user?.id ?? ''), enabled: Boolean(user) && open })
  const [conversations, setConversations] = React.useState<Set<string>>(new Set())
  const [people, setPeople] = React.useState<Array<PersonSummary>>([])
  const [note, setNote] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const recent = (inbox?.conversations ?? []).slice(0, 8)
  const count = conversations.size + people.length

  React.useEffect(() => {
    if (open) return
    setConversations(new Set())
    setPeople([])
    setNote('')
  }, [open])

  const send = async () => {
    setBusy(true)
    try {
      const result = await share({
        data: {
          postId: post.id,
          conversationIds: [...conversations],
          userIds: people.map((person) => person.id),
          note: note.trim(),
        },
      })
      if (!result.ok) return toast.error(result.error)
      trackStoryShare(post.id, 'message')
      void queryClient.invalidateQueries({ queryKey: ['inbox'] })
      void queryClient.invalidateQueries({ queryKey: ['messages'] })
      onOpenChange(false)
      const { sent, conversationId } = result.data
      toast.success(sent === 1 ? 'Sent' : `Sent to ${sent} conversations`, {
        action: conversationId
          ? {
              label: 'Open',
              onClick: () => void navigate({ to: '/messages/$conversationId', params: { conversationId } }),
            }
          : undefined,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Share story"
      description={<span className="line-clamp-1">{post.title}</span>}
      footer={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={async () => {
              if (await copyToClipboard(url)) trackStoryShare(post.id, 'copy')
            }}
          >
            <Link2 />
            Copy link
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={async () => {
              const method = await shareLink({ title: post.title, url })
              if (method) trackStoryShare(post.id, method)
            }}
          >
            <Share />
            More
          </Button>
          {user && (
            <Button
              variant="primary"
              size="md"
              className="ml-auto"
              disabled={count === 0}
              loading={busy}
              onClick={() => void send()}
            >
              <Send />
              Send{count > 1 ? ` (${count})` : ''}
            </Button>
          )}
        </div>
      }
    >
      {user ? (
        <div className="space-y-4 px-5 py-4">
          {recent.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-caption-1 font-semibold text-label-tertiary">Recent</p>
              <ul role="list" className="-mx-1 flex [scrollbar-width:none] gap-1 overflow-x-auto pb-1">
                {recent.map((conversation) => {
                  const picked = conversations.has(conversation.id)
                  return (
                    <li key={conversation.id} className="w-[72px] shrink-0">
                      <button
                        type="button"
                        aria-pressed={picked}
                        disabled={!picked && count >= MAX_TARGETS}
                        onClick={() =>
                          setConversations((set) => {
                            const next = new Set(set)
                            if (next.has(conversation.id)) next.delete(conversation.id)
                            else next.add(conversation.id)
                            return next
                          })
                        }
                        className="flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2 hover:bg-fill-secondary"
                      >
                        <span className="relative">
                          <ConversationAvatar conversation={conversation} viewerId={user.id} size={48} />
                          <span
                            aria-hidden
                            className={cn(
                              'absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full ring-2 ring-surface transition-colors',
                              picked
                                ? 'bg-brand text-on-brand'
                                : 'bg-transparent text-transparent ring-transparent',
                            )}
                          >
                            <Check className="size-3" strokeWidth={3} />
                          </span>
                        </span>
                        <span className="line-clamp-2 text-center text-caption-2 leading-tight text-label">
                          {conversation.title}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          <div>
            <p className="mb-2 px-1 text-caption-1 font-semibold text-label-tertiary">Send to someone</p>
            <PeoplePicker selected={people} onChange={setPeople} max={MAX_TARGETS - conversations.size} />
          </div>
          <Textarea
            rows={2}
            maxRows={5}
            value={note}
            maxLength={LIMITS.messageMax}
            placeholder="Add a note (optional)"
            aria-label="Note"
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      ) : (
        <div className="px-5 py-6 text-center">
          <p className="text-subhead text-label-secondary">
            Sign in to send stories to friends and groups right inside Refetch.
          </p>
          <Button asChild variant="primary" size="md" className="mt-4">
            <Link to="/signin" search={{ redirect: location.href }}>
              Sign in
            </Link>
          </Button>
        </div>
      )}
    </Dialog>
  )
}

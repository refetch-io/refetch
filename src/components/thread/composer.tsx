import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ArrowUp, CornerDownRight, X } from 'lucide-react'
import { toast } from 'sonner'
import { addComment } from '@/api/content'
import type { CommentNode } from '@/lib/comments'
import { LIMITS } from '@/lib/constants'
import { useSession } from '@/lib/session'
import type { Comment, Thread } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'
import { Kbd } from '../ui/misc'

interface ComposerProps {
  postId: string
  queryKey: ReadonlyArray<unknown>
  replyingTo: CommentNode | null
  onCancelReply: () => void
  onPosted: (comment: Comment) => void
}

/** Floating, iMessage-style composer pinned to the bottom of the thread. */
export function Composer({ postId, queryKey, replyingTo, onCancelReply, onPosted }: ComposerProps) {
  const { user } = useSession()
  const location = useLocation()
  const queryClient = useQueryClient()
  const postComment = useServerFn(addComment)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [text, setText] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (replyingTo) textareaRef.current?.focus()
  }, [replyingTo])

  // Grow with the content, up to ~8 lines.
  React.useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [text])

  const wrapper =
    'sticky bottom-0 z-30 -mx-4 mt-6 bg-gradient-to-t from-bg/80 from-25% to-transparent px-4 pt-8 pb-[max(14px,env(safe-area-inset-bottom))] sm:mx-0 sm:px-0'

  if (!user) {
    return (
      <div className={wrapper}>
        <div className="flex flex-col items-center justify-between gap-3 rounded-[22px] bg-surface/85 p-4 shadow-raised ring-1 ring-separator backdrop-blur-xl sm:flex-row sm:pl-5">
          <div className="text-center sm:text-left">
            <p className="text-subhead font-semibold text-label">Join the discussion</p>
            <p className="text-footnote text-label-secondary">Sign in to comment and vote.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary" size="md">
              <Link to="/signup" search={{ redirect: location.href }}>
                Create account
              </Link>
            </Button>
            <Button asChild variant="primary" size="md">
              <Link to="/signin" search={{ redirect: location.href }}>
                Sign in
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const submit = async () => {
    const content = text.trim()
    if (!content || submitting) return
    setSubmitting(true)
    try {
      const result = await postComment({ data: { postId, content, replyId: replyingTo?.id } })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      queryClient.setQueryData<Thread>(queryKey, (current) =>
        current
          ? {
              ...current,
              post: { ...current.post, countComments: current.post.countComments + 1 },
              comments: [result.data, ...current.comments],
            }
          : current,
      )
      setText('')
      onCancelReply()
      onPosted(result.data)
    } catch {
      toast.error('Couldn’t post your comment', { description: 'Check your connection and try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const remaining = LIMITS.commentMax - text.length

  return (
    <div className={wrapper}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        className="overflow-hidden rounded-[22px] bg-surface/85 shadow-raised ring-1 ring-separator backdrop-blur-xl transition-[box-shadow] focus-within:ring-brand/40"
      >
        {replyingTo && (
          <div className="flex animate-fade-in items-center gap-2 border-b border-separator py-2 pr-2 pl-4 text-footnote text-label-secondary">
            <CornerDownRight className="size-4 shrink-0 text-brand-text" aria-hidden />
            <p className="min-w-0 flex-1 truncate">
              Replying to <span className="font-semibold text-label">{replyingTo.userName}</span>
              <span className="text-label-tertiary">: “{replyingTo.content.slice(0, 80)}”</span>
            </p>
            <Button variant="ghost" size="icon-xs" aria-label="Cancel reply" onClick={onCancelReply}>
              <X />
            </Button>
          </div>
        )}
        <div className="flex items-end gap-2 p-2 pl-3">
          <Avatar name={user.name || user.email} userId={user.id} size={28} className="mb-1 max-sm:hidden" />
          <label htmlFor="composer" className="sr-only">
            {replyingTo ? `Reply to ${replyingTo.userName}` : 'Write a comment'}
          </label>
          <textarea
            id="composer"
            ref={textareaRef}
            rows={1}
            value={text}
            maxLength={LIMITS.commentMax}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                void submit()
              }
              if (event.key === 'Escape' && replyingTo) onCancelReply()
            }}
            placeholder={replyingTo ? `Reply to ${replyingTo.userName}…` : 'Add to the discussion…'}
            className="max-h-[200px] min-h-9 flex-1 resize-none bg-transparent px-1 py-[7px] text-callout text-label outline-none placeholder:text-label-tertiary"
          />
          <Button
            type="submit"
            variant="primary"
            size="icon"
            loading={submitting}
            disabled={!text.trim()}
            aria-label={replyingTo ? 'Post reply' : 'Post comment'}
            className="disabled:bg-fill-strong disabled:text-label-tertiary disabled:opacity-100"
          >
            <ArrowUp strokeWidth={2.75} />
          </Button>
        </div>
      </form>
      <div
        className={cn(
          'mt-1.5 flex justify-end gap-3 px-3 text-caption-1 text-label-tertiary transition-opacity max-sm:hidden',
          text ? 'opacity-100' : 'opacity-0',
        )}
        aria-hidden={!text}
      >
        {remaining < 500 && <span className="tabular">{remaining} left</span>}
        <span className="inline-flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>↩</Kbd>
          to post
        </span>
      </div>
    </div>
  )
}

import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  Reply,
  Trash2,
} from 'lucide-react'
import { Favicon } from '@/components/favicon'
import { FeedRightSidebar } from '@/components/feed-right-sidebar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { useAuth } from '@/contexts/auth-context'
import { useModKeyLabel } from '@/hooks/use-mod-key'
import { api } from '@/lib/api/client'
import { fetchThread } from '@/lib/feed.functions'
import { calculateOptimisticVoteState } from '@/lib/vote-state'
import type { Comment, VoteState } from '@/lib/types'
import { reportPresenceActivity, clearPresenceActivity } from '@/lib/presence'
import { cn, getInitials } from '@/lib/utils'

const MAX_REPLY_DEPTH = 3

function submitOnModEnter(event: React.KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return
  event.preventDefault()
  event.currentTarget.form?.requestSubmit()
}

function KeyboardSubmitHint({ action = 'submit' }: { action?: string }) {
  const modKey = useModKeyLabel()

  if (!modKey) {
    return (
      <p
        aria-hidden
        className="h-[1.125rem] w-40 text-[11px] text-transparent"
      >
        &nbsp;
      </p>
    )
  }

  return (
    <p className="text-[11px] text-muted-foreground">
      Press{' '}
      <kbd className="rounded border border-border/70 bg-background px-1 py-0.5 font-sans text-[10px] font-medium text-foreground/80">
        {modKey}
      </kbd>{' '}
      <kbd className="rounded border border-border/70 bg-background px-1 py-0.5 font-sans text-[10px] font-medium text-foreground/80">
        Enter
      </kbd>{' '}
      to {action}
    </p>
  )
}

export const Route = createFileRoute('/_app/threads/$threadId')({
  loader: ({ params }) => fetchThread({ data: { threadId: params.threadId } }),
  component: ThreadPage,
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.post
          ? `${loaderData.post.title} - Refetch`
          : 'Thread - Refetch',
      },
    ],
  }),
})

function countComments(items: Comment[]): number {
  return items.reduce(
    (total, comment) => total + 1 + countComments(comment.replies ?? []),
    0,
  )
}

function insertReply(
  items: Comment[],
  parentId: string,
  reply: Comment,
): Comment[] {
  return items.map((comment) => {
    if (comment.id === parentId) {
      return {
        ...comment,
        replies: [...(comment.replies ?? []), { ...reply, replies: [] }],
      }
    }
    if (comment.replies?.length) {
      return {
        ...comment,
        replies: insertReply(comment.replies, parentId, reply),
      }
    }
    return comment
  })
}

function removeComment(items: Comment[], commentId: string): Comment[] {
  return items.flatMap((comment) => {
    if (comment.id === commentId) return []
    if (!comment.replies?.length) return [comment]
    return [
      {
        ...comment,
        replies: removeComment(comment.replies, commentId),
      },
    ]
  })
}

function markCommentDeleted(items: Comment[], commentId: string): Comment[] {
  return items.map((comment) => {
    if (comment.id === commentId) {
      return { ...comment, text: '[deleted]' }
    }
    if (!comment.replies?.length) return comment
    return {
      ...comment,
      replies: markCommentDeleted(comment.replies, commentId),
    }
  })
}

function VoteControls({
  voteState,
  isVoting,
  onVote,
}: {
  voteState: VoteState
  isVoting: boolean
  onVote: (direction: 'up' | 'down') => void
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={isVoting}
        onClick={() => onVote('up')}
        className={cn(
          'size-5 [&_svg:not([class*="size-"])]:size-3',
          voteState.currentVote === 'up' &&
            'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-400',
        )}
        aria-label="Upvote"
      >
        <ChevronUp />
      </Button>
      <span
        className={cn(
          'text-[11px] leading-none font-medium tabular-nums',
          voteState.currentVote === 'up' &&
            'text-emerald-600 dark:text-emerald-400',
          voteState.currentVote === 'down' && 'text-destructive',
        )}
      >
        {voteState.count}
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={isVoting}
        onClick={() => onVote('down')}
        className={cn(
          'size-5 [&_svg:not([class*="size-"])]:size-3',
          voteState.currentVote === 'down' &&
            'bg-destructive/15 text-destructive hover:bg-destructive/15 hover:text-destructive',
        )}
        aria-label="Downvote"
      >
        <ChevronDown />
      </Button>
    </div>
  )
}

type ReplyTarget = { id: string; author: string }

function ThreadPage() {
  const { post, comments: initialComments } = Route.useLoaderData()
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const [comments, setComments] = useState(initialComments)
  const [voteState, setVoteState] = useState<VoteState>({
    currentVote: null,
    count: post.count,
  })
  const [isVoting, setIsVoting] = useState(false)
  const [text, setText] = useState('')
  const [replyText, setReplyText] = useState('')
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null)
  const [error, setError] = useState('')
  const [replyError, setReplyError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({})
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null)

  useEffect(() => {
    setComments(initialComments)
    setVoteState({ currentVote: null, count: post.count })
    setReplyTo(null)
    setReplyText('')
  }, [initialComments, post.count, post.id])

  useEffect(() => {
    if (!isAuthenticated) return
    ;(async () => {
      try {
        setVoteState(
          await api.getVote({
            resourceId: post.id,
            resourceType: 'post',
          }),
        )
      } catch {
        // ignore
      }
    })()
  }, [isAuthenticated, post.id])

  const totalComments = useMemo(() => countComments(comments), [comments])
  const commentCountLabel =
    totalComments === 1 ? '1 comment' : `${totalComments} comments`

  const handleVote = async (direction: 'up' | 'down') => {
    if (!isAuthenticated) {
      window.location.href = '/signin'
      return
    }
    const previous = voteState
    setIsVoting(true)
    reportPresenceActivity(direction === 'up' ? 'Upvoting' : 'Downvoting')
    setVoteState(
      calculateOptimisticVoteState(
        previous.currentVote,
        direction,
        previous.count,
      ),
    )
    try {
      const result = await api.castVote({
        resourceId: post.id,
        resourceType: 'post',
        voteType: direction,
      })
      setVoteState({
        currentVote: result.voteType,
        count: result.count,
        countUp: result.countUp,
        countDown: result.countDown,
      })
    } catch {
      setVoteState(previous)
    } finally {
      setIsVoting(false)
      clearPresenceActivity()
    }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      window.location.href = '/signin'
      return
    }
    setSubmitting(true)
    setError('')
    reportPresenceActivity('Commenting')
    try {
      const comment = await api.createComment(post.id, { text })
      setComments((prev) => [{ ...comment, replies: [] }, ...prev])
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to comment')
    } finally {
      setSubmitting(false)
      clearPresenceActivity()
    }
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyTo) return
    if (!isAuthenticated) {
      window.location.href = '/signin'
      return
    }
    setReplySubmitting(true)
    setReplyError('')
    reportPresenceActivity('Replying')
    try {
      const comment = await api.createComment(post.id, {
        text: replyText,
        replyId: replyTo.id,
      })
      setComments((prev) => insertReply(prev, replyTo.id, comment))
      setReplyText('')
      setReplyTo(null)
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Failed to reply')
    } finally {
      setReplySubmitting(false)
      clearPresenceActivity()
    }
  }

  const startReply = (target: ReplyTarget) => {
    if (!isAuthenticated) {
      window.location.href = '/signin'
      return
    }
    setReplyError('')
    setReplyText('')
    setReplyTo(target)
  }

  const requestDeleteComment = (commentId: string) => {
    if (!isAuthenticated) {
      window.location.href = '/signin'
      return
    }
    setDeleteCommentId(commentId)
  }

  const handleDeleteComment = async (commentId: string) => {
    setDeletingIds((prev) => ({ ...prev, [commentId]: true }))
    try {
      const result = await api.deleteComment(commentId)
      setComments((prev) =>
        result.soft
          ? markCommentDeleted(prev, commentId)
          : removeComment(prev, commentId),
      )
      if (replyTo?.id === commentId) {
        setReplyTo(null)
        setReplyText('')
        setReplyError('')
      }
      setDeleteCommentId(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete comment',
      )
    } finally {
      setDeletingIds((prev) => {
        const next = { ...prev }
        delete next[commentId]
        return next
      })
    }
  }

  const deletingPending =
    deleteCommentId !== null && !!deletingIds[deleteCommentId]

  const hasExternalLink = !!post.link?.startsWith('http')
  const sourceHref =
    hasExternalLink && post.link
      ? `${post.link}${post.link.includes('?') ? '&' : '?'}ref=refetch.io`
      : undefined

  return (
    <main className="flex min-w-0 flex-col">
      <div className="flex w-full gap-0 px-8 sm:px-12 lg:gap-10 lg:px-16">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="pt-1 pb-3">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link to="/">
                <ArrowLeft className="size-3.5" />
                Back to feed
              </Link>
            </Button>
          </div>

          <article className="border-y border-border/40">
            <div className="flex items-start gap-3 py-5">
              <VoteControls
                voteState={voteState}
                isVoting={isVoting}
                onVote={handleVote}
              />

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {post.type === 'show' && (
                    <Badge
                      variant="brand"
                      className="h-[1.125rem] px-1.5 text-[10px] tracking-wide uppercase"
                    >
                      Show
                    </Badge>
                  )}
                  <h1 className="font-sans text-lg leading-snug font-normal tracking-tight sm:text-xl">
                    {post.title}
                  </h1>
                  {sourceHref ? (
                    <a
                      href={sourceHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      source
                      <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Favicon domain={post.domain} size={14} />
                  <span>{post.domain.replace(/^www\./, '')}</span>
                  {post.timeAgo ? (
                    <>
                      <span aria-hidden>•</span>
                      <span>{post.timeAgo}</span>
                    </>
                  ) : null}
                  <span aria-hidden>•</span>
                  <span>{post.author}</span>
                  <span aria-hidden>•</span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="size-3" />
                    {commentCountLabel}
                  </span>
                </div>

                {post.description || post.tldr ? (
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    {post.tldr || post.description}
                  </p>
                ) : null}
              </div>
            </div>
          </article>

          <section className="py-6">
            <div className="mb-5 flex items-baseline justify-between gap-3">
              <h2 className="font-heading text-base font-semibold tracking-tight">
                Discussion
              </h2>
              <p className="text-xs text-muted-foreground">{commentCountLabel}</p>
            </div>

            <div className="mb-6 rounded-xl border border-border/50 bg-muted/20 p-3 sm:p-4">
              {error ? (
                <Alert variant="destructive" className="mb-3">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <form
                onSubmit={
                  isAuthenticated
                    ? handleComment
                    : (event) => {
                        event.preventDefault()
                      }
                }
                className="flex flex-col gap-3"
              >
                <Textarea
                  value={isAuthenticated ? text : ''}
                  onChange={(e) => setText(e.target.value)}
                  onFocus={() => {
                    if (isAuthenticated) reportPresenceActivity('Typing…')
                  }}
                  onBlur={() => {
                    if (isAuthenticated) clearPresenceActivity()
                  }}
                  onKeyDown={isAuthenticated ? submitOnModEnter : undefined}
                  placeholder={
                    authLoading
                      ? ''
                      : isAuthenticated
                        ? 'Share your thoughts…'
                        : 'Sign in to join the discussion…'
                  }
                  rows={3}
                  required={isAuthenticated}
                  disabled={authLoading || !isAuthenticated}
                  className="min-h-20 resize-y bg-background disabled:cursor-not-allowed disabled:opacity-70"
                />
                <div className="flex min-h-8 items-center justify-between gap-3">
                  {authLoading ? null : isAuthenticated ? (
                    <>
                      <KeyboardSubmitHint action="comment" />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={submitting || !text.trim()}
                      >
                        Comment
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Sign in to join the discussion.
                      </p>
                      <Button type="button" size="sm" asChild>
                        <Link to="/signin">Sign in</Link>
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </div>

            {comments.length === 0 ? (
              <Empty className="border border-dashed border-border/50 py-10">
                <EmptyHeader>
                  <EmptyTitle>No comments yet</EmptyTitle>
                  <EmptyDescription>
                    Be the first to share a take on this story.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="divide-y divide-border/40 border-y border-border/40">
                {comments.map((comment) => (
                  <CommentNode
                    key={comment.id}
                    comment={comment}
                    depth={0}
                    postAuthorId={post.userId}
                    currentUserId={user?.$id}
                    replyTo={replyTo}
                    replyText={replyText}
                    replyError={replyError}
                    replySubmitting={replySubmitting}
                    onReplyTextChange={setReplyText}
                    onStartReply={startReply}
                    onCancelReply={() => {
                      setReplyTo(null)
                      setReplyText('')
                      setReplyError('')
                    }}
                    onSubmitReply={handleReply}
                    onDelete={requestDeleteComment}
                    isDeletingComment={(id) => !!deletingIds[id]}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="hidden w-72 shrink-0 border-l border-border/60 pl-8 lg:block">
          <div className="sticky top-6 z-10">
            <FeedRightSidebar />
          </div>
        </aside>
      </div>

      <AlertDialog
        open={deleteCommentId !== null}
        onOpenChange={(open) => {
          if (!open && !deletingPending) setDeleteCommentId(null)
        }}
      >
        <AlertDialogContent size="default" className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Replies may remain with the comment marked
              as deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingPending || !deleteCommentId}
              onClick={(event) => {
                event.preventDefault()
                if (deleteCommentId) void handleDeleteComment(deleteCommentId)
              }}
            >
              {deletingPending ? <Spinner data-icon="inline-start" /> : null}
              Delete comment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

function CommentNode({
  comment,
  depth,
  postAuthorId,
  currentUserId,
  replyTo,
  replyText,
  replyError,
  replySubmitting,
  onReplyTextChange,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  onDelete,
  isDeletingComment,
}: {
  comment: Comment
  depth: number
  postAuthorId: string
  currentUserId?: string
  replyTo: ReplyTarget | null
  replyText: string
  replyError: string
  replySubmitting: boolean
  onReplyTextChange: (value: string) => void
  onStartReply: (target: ReplyTarget) => void
  onCancelReply: () => void
  onSubmitReply: (e: React.FormEvent) => void
  onDelete: (commentId: string) => void
  isDeletingComment: (commentId: string) => boolean
}) {
  const isOp = Boolean(comment.userId) && comment.userId === postAuthorId
  const isOwn =
    Boolean(currentUserId) &&
    Boolean(comment.userId) &&
    comment.userId === currentUserId
  const isDeleted = comment.text.trim() === '[deleted]'
  const canReply = depth < MAX_REPLY_DEPTH && !isDeleted
  const canDelete = isOwn && !isDeleted
  const isReplying = replyTo?.id === comment.id
  const deleting = isDeletingComment(comment.id)
  const indent = Math.min(depth, MAX_REPLY_DEPTH)

  return (
    <div
      className={cn(
        'py-4',
        indent > 0 && 'border-l border-border/40 pl-4 sm:pl-5',
      )}
      style={indent > 0 ? { marginLeft: `${indent * 0.75}rem` } : undefined}
    >
      <div className="flex items-start gap-3">
        <Avatar className="mt-0.5 size-7">
          <AvatarFallback className="bg-foreground text-[10px] text-background">
            {getInitials(comment.author, 2)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{comment.author}</span>
            {isOp ? (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                OP
              </span>
            ) : null}
            {comment.timeAgo ? (
              <>
                <span aria-hidden>•</span>
                <span>{comment.timeAgo}</span>
              </>
            ) : null}
          </div>
          <p
            className={cn(
              'whitespace-pre-wrap text-sm leading-relaxed',
              isDeleted
                ? 'italic text-muted-foreground'
                : 'text-foreground/90',
            )}
          >
            {comment.text}
          </p>

          {canReply || canDelete ? (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {canReply ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    isReplying
                      ? onCancelReply()
                      : onStartReply({ id: comment.id, author: comment.author })
                  }
                >
                  <Reply className="size-3" />
                  {isReplying ? 'Cancel' : 'Reply'}
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={deleting}
                  className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(comment.id)}
                >
                  <Trash2 className="size-3" />
                  {deleting ? 'Deleting…' : 'Delete'}
                </Button>
              ) : null}
            </div>
          ) : null}

          {isReplying ? (
            <form
              onSubmit={onSubmitReply}
              className="mt-3 rounded-lg border border-border/50 bg-muted/20 p-3"
            >
              <p className="mb-2 text-xs text-muted-foreground">
                Replying to{' '}
                <span className="font-medium text-foreground">
                  {comment.author}
                </span>
              </p>
              {replyError ? (
                <Alert variant="destructive" className="mb-2">
                  <AlertDescription>{replyError}</AlertDescription>
                </Alert>
              ) : null}
              <Textarea
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                onFocus={() => reportPresenceActivity('Typing…')}
                onBlur={() => clearPresenceActivity()}
                onKeyDown={submitOnModEnter}
                placeholder="Write a reply…"
                rows={3}
                required
                autoFocus
                className="min-h-16 resize-y bg-background"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <KeyboardSubmitHint action="reply" />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancelReply}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={replySubmitting || !replyText.trim()}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </form>
          ) : null}
        </div>
      </div>

      {comment.replies?.map((reply) => (
        <div key={reply.id} className="mt-3">
          <CommentNode
            comment={reply}
            depth={depth + 1}
            postAuthorId={postAuthorId}
            currentUserId={currentUserId}
            replyTo={replyTo}
            replyText={replyText}
            replyError={replyError}
            replySubmitting={replySubmitting}
            onReplyTextChange={onReplyTextChange}
            onStartReply={onStartReply}
            onCancelReply={onCancelReply}
            onSubmitReply={onSubmitReply}
            onDelete={onDelete}
            isDeletingComment={isDeletingComment}
          />
        </div>
      ))}
    </div>
  )
}

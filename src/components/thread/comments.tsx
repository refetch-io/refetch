import { Link } from '@tanstack/react-router'
import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { ChevronDown, MessageCircle, Pencil, Reply, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteComment, updateComment } from '@/api/content'
import { buildCommentTree, countDescendants, type CommentNode, type CommentSort } from '@/lib/comments'
import { COMMENT_EDIT_WINDOW_MS, LIMITS, MAX_COMMENT_DEPTH } from '@/lib/constants'
import { useSession } from '@/lib/session'
import type { Comment, Thread } from '@/lib/types'
import { cn, formatDateTime, isBotUser, timeAgo } from '@/lib/utils'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Dot, EmptyState } from '../ui/misc'
import { Textarea } from '../ui/input'
import { SegmentedControl } from '../ui/segmented-control'
import { BotBadge } from '../bot-badge'
import { RichText } from '../rich-text'
import { VoteControl } from '../vote-control'
import { ReportButton } from '../moderation/report-dialog'

const SORT_OPTIONS = [
  { value: 'oldest', label: 'Oldest' },
  { value: 'newest', label: 'Newest' },
  { value: 'top', label: 'Top' },
] as const

interface CommentsSectionProps {
  thread: Thread
  queryKey: ReadonlyArray<unknown>
  highlightId: string | null
  onReply: (comment: CommentNode) => void
}

export function CommentsSection({ thread, queryKey, highlightId, onReply }: CommentsSectionProps) {
  const [sort, setSort] = React.useState<CommentSort>('oldest')
  const [pendingDelete, setPendingDelete] = React.useState<CommentNode | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const { user } = useSession()
  const queryClient = useQueryClient()
  const removeComment = useServerFn(deleteComment)

  const tree = React.useMemo(() => buildCommentTree(thread.comments, sort), [thread.comments, sort])

  const onEdited = React.useCallback(
    (updated: Comment) =>
      queryClient.setQueryData<Thread>(queryKey, (current) =>
        current
          ? {
              ...current,
              comments: current.comments.map((comment) =>
                comment.id === updated.id
                  ? { ...updated, vote: comment.vote, count: comment.count }
                  : comment,
              ),
            }
          : current,
      ),
    [queryClient, queryKey],
  )

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const result = await removeComment({ data: { id: pendingDelete.id } })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      queryClient.setQueryData<Thread>(queryKey, (current) =>
        current
          ? {
              ...current,
              post: { ...current.post, countComments: Math.max(0, current.post.countComments - 1) },
              comments: current.comments.filter((comment) => comment.id !== pendingDelete.id),
            }
          : current,
      )
      toast.success('Comment deleted')
    } catch {
      toast.error('Couldn’t delete the comment. Please try again.')
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  return (
    <section aria-labelledby="comments-heading" className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2 id="comments-heading" className="flex items-baseline gap-2 text-title-3 text-label">
          Comments
          <span className="font-rounded text-headline font-semibold text-label-tertiary tabular">
            {thread.comments.length}
          </span>
        </h2>
        {thread.comments.length > 1 && (
          <SegmentedControl
            aria-label="Sort comments"
            size="sm"
            className="w-[min(15rem,55vw)]"
            value={sort}
            onValueChange={setSort}
            options={SORT_OPTIONS}
          />
        )}
      </div>

      {tree.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MessageCircle />}
            title="No comments yet"
            description="Be the first to share a thought. Start the conversation below."
          />
        </Card>
      ) : (
        <Card className="px-4 sm:px-5">
          {tree.map((node, index) => (
            <div key={node.id} className={cn(index > 0 && 'border-t border-separator')}>
              <CommentItem
                node={node}
                opUserId={thread.post.userId}
                currentUserId={user?.id ?? null}
                highlightId={highlightId}
                onReply={onReply}
                onDelete={setPendingDelete}
                onEdited={onEdited}
              />
            </div>
          ))}
        </Card>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this comment?"
        description="This can’t be undone. Replies to it will stay in the thread."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </section>
  )
}

interface CommentItemProps {
  node: CommentNode
  opUserId: string
  currentUserId: string | null
  highlightId: string | null
  onReply: (comment: CommentNode) => void
  onDelete: (comment: CommentNode) => void
  onEdited: (comment: Comment) => void
}

/** Whether the comment's edit window is still open (decided after hydration; it depends on the clock). */
function useEditable(createdAt: string, isAuthor: boolean) {
  const [editable, setEditable] = React.useState(false)
  React.useEffect(() => {
    if (!isAuthor) return setEditable(false)
    const remaining = new Date(createdAt).getTime() + COMMENT_EDIT_WINDOW_MS - Date.now()
    setEditable(remaining > 0)
    if (remaining <= 0) return
    const timer = setTimeout(() => setEditable(false), Math.min(remaining, 2 ** 31 - 1))
    return () => clearTimeout(timer)
  }, [createdAt, isAuthor])
  return editable
}

function CommentItem({
  node,
  opUserId,
  currentUserId,
  highlightId,
  onReply,
  onDelete,
  onEdited,
}: CommentItemProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const isAuthor = Boolean(currentUserId) && currentUserId === node.userId
  const editable = useEditable(node.createdAt, isAuthor)
  const hiddenCount = collapsed ? countDescendants(node) : 0
  const isBot = isBotUser(node.userId)
  const isRoot = node.depth === 0

  return (
    <article id={`comment-${node.id}`} data-kb-item className={cn('scroll-mt-24', isRoot ? 'py-4' : 'pt-4')}>
      <div className="flex gap-3">
        <Link
          to="/users/$userId"
          params={{ userId: node.userId }}
          aria-label={node.userName}
          className="mt-0.5 shrink-0"
        >
          <Avatar name={node.userName} userId={node.userId} size={isRoot ? 32 : 26} />
        </Link>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              '-mx-2 rounded-xl px-2 py-0.5 transition-colors duration-[1.6s]',
              highlightId === node.id ? 'animate-[flash_2.4s_var(--ease-apple)_both]' : '',
            )}
          >
            <header className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-footnote">
              <Link
                to="/users/$userId"
                params={{ userId: node.userId }}
                className="font-semibold text-label hover:text-brand-text"
              >
                {node.userName}
              </Link>
              {isBot && <BotBadge />}
              {!isBot && node.userId === opUserId && (
                <Badge variant="brand" size="xs" title="Original poster">
                  OP
                </Badge>
              )}
              <Dot />
              <time
                dateTime={node.createdAt}
                title={formatDateTime(node.createdAt)}
                className="text-label-tertiary"
                suppressHydrationWarning
              >
                {timeAgo(node.createdAt)}
              </time>
              {node.editedAt && (
                <span
                  className="text-label-tertiary"
                  title={`Edited ${formatDateTime(node.editedAt)}`}
                  suppressHydrationWarning
                >
                  (edited)
                </span>
              )}
            </header>
            {editing ? (
              <CommentEditor
                comment={node}
                onCancel={() => setEditing(false)}
                onSaved={(updated) => {
                  onEdited(updated)
                  setEditing(false)
                }}
              />
            ) : (
              <RichText text={node.content} className="mt-1 text-subhead leading-[1.55] text-label" />
            )}
          </div>

          <footer className="mt-2 -ml-1 flex flex-wrap items-center gap-1">
            <VoteControl
              type="comment"
              id={node.id}
              initial={{ vote: node.vote, count: node.count }}
              orientation="horizontal"
              size="sm"
            />
            {node.depth < MAX_COMMENT_DEPTH && (
              <Button variant="ghost" size="xs" data-kb-action="reply" onClick={() => onReply(node)}>
                <Reply />
                Reply
              </Button>
            )}
            {node.children.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                aria-expanded={!collapsed}
                onClick={() => setCollapsed((c) => !c)}
              >
                <ChevronDown className={cn('transition-transform duration-300', collapsed && '-rotate-90')} />
                {collapsed ? `${hiddenCount} ${hiddenCount === 1 ? 'reply' : 'replies'}` : 'Hide'}
              </Button>
            )}
            {editable && !editing && (
              <Button variant="ghost" size="xs" data-kb-action="edit" onClick={() => setEditing(true)}>
                <Pencil />
                Edit
              </Button>
            )}
            {isAuthor && (
              <Button
                variant="ghost"
                size="xs"
                className="hover:bg-down-tint hover:text-down"
                onClick={() => onDelete(node)}
              >
                <Trash2 />
                Delete
              </Button>
            )}
            {!isAuthor && <ReportButton resourceType="comment" resourceId={node.id} className="ml-auto" />}
          </footer>

          {!collapsed && node.children.length > 0 && (
            <div className="relative pl-4 before:absolute before:top-4 before:bottom-1 before:left-0 before:w-0.5 before:rounded-full before:bg-separator">
              {node.children.map((child) => (
                <CommentItem
                  key={child.id}
                  node={child}
                  opUserId={opUserId}
                  currentUserId={currentUserId}
                  highlightId={highlightId}
                  onReply={onReply}
                  onDelete={onDelete}
                  onEdited={onEdited}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function CommentEditor({
  comment,
  onCancel,
  onSaved,
}: {
  comment: Comment
  onCancel: () => void
  onSaved: (comment: Comment) => void
}) {
  const save = useServerFn(updateComment)
  const [text, setText] = React.useState(comment.content)
  const [saving, setSaving] = React.useState(false)
  const unchanged = text.trim() === comment.content.trim()

  const submit = async () => {
    if (!text.trim() || saving) return
    if (unchanged) return onCancel()
    setSaving(true)
    try {
      const result = await save({ data: { id: comment.id, content: text } })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      onSaved(result.data)
      toast.success('Comment updated')
    } catch {
      toast.error('Couldn’t save your edit. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="mt-2"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <Textarea
        aria-label="Edit your comment"
        autoFocus
        rows={3}
        maxRows={12}
        maxLength={LIMITS.commentMax}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            void submit()
          }
          if (event.key === 'Escape') onCancel()
        }}
        className="py-2.5 text-subhead"
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" loading={saving} disabled={!text.trim()}>
          Save
        </Button>
      </div>
    </form>
  )
}

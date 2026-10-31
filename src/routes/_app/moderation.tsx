import * as React from 'react'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Check, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { resolveReport } from '@/api/moderation'
import { moderationQuery } from '@/lib/queries'
import { reportReasonLabel, type ModerationItem } from '@/lib/reports'
import { SITE_URL, seo } from '@/lib/seo'
import { formatDateTime, timeAgo } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dot, EmptyState } from '@/components/ui/misc'
import { ColumnTitle } from '@/components/feed/feed-column'
import { FeedLayout } from '@/components/feed/feed-layout'

export const Route = createFileRoute('/_app/moderation')({
  beforeLoad: ({ context }) => {
    // Not a page anyone else should learn exists.
    if (!context.user?.moderator) throw notFound()
    return { user: context.user }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(moderationQuery(context.user.id)),
  head: () => ({
    meta: seo({ title: 'Moderation - Refetch', url: `${SITE_URL}/moderation`, noindex: true }),
  }),
  component: ModerationPage,
})

function ModerationPage() {
  const { user } = Route.useRouteContext()
  const query = moderationQuery(user.id)
  const { data: items } = useSuspenseQuery(query)
  const queryClient = useQueryClient()
  const resolve = useServerFn(resolveReport)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [removing, setRemoving] = React.useState<ModerationItem | null>(null)

  const act = async (item: ModerationItem, action: 'dismiss' | 'remove') => {
    setBusy(item.resourceId)
    try {
      const result = await resolve({
        data: { resourceType: item.resourceType, resourceId: item.resourceId, action },
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      queryClient.setQueryData(query.queryKey, (current) =>
        current?.filter((other) => other.resourceId !== item.resourceId),
      )
      toast.success(action === 'remove' ? 'Removed' : 'Reports dismissed')
      void queryClient.invalidateQueries({ queryKey: ['moderation-count'] })
      if (action === 'remove') {
        void queryClient.invalidateQueries({ queryKey: ['thread', item.postId] })
        void queryClient.invalidateQueries({ queryKey: ['feed'] })
      }
    } catch {
      toast.error('Couldn’t do that. Please try again.')
    } finally {
      setBusy(null)
      setRemoving(null)
    }
  }

  return (
    <FeedLayout
      column={
        <ColumnTitle
          title="Moderation"
          subtitle={
            items.length === 0
              ? 'All clear'
              : `${items.length} reported ${items.length === 1 ? 'item' : 'items'}, most reported first`
          }
        />
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck />}
          title="No open reports"
          description="When people report stories or comments, they show up here."
        />
      ) : (
        <ul className="divide-y divide-separator">
          {items.map((item) => (
            <ModerationRow
              key={`${item.resourceType}:${item.resourceId}`}
              item={item}
              busy={busy === item.resourceId}
              onDismiss={() => void act(item, 'dismiss')}
              onRemove={() => (item.exists ? setRemoving(item) : void act(item, 'dismiss'))}
            />
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={removing?.resourceType === 'post' ? 'Remove this story?' : 'Remove this comment?'}
        description="It’s deleted for everyone and its reports are closed. This can’t be undone."
        confirmLabel="Remove"
        destructive
        loading={busy !== null}
        onConfirm={() => removing && void act(removing, 'remove')}
      />
    </FeedLayout>
  )
}

function ModerationRow({
  item,
  busy,
  onDismiss,
  onRemove,
}: {
  item: ModerationItem
  busy: boolean
  onDismiss: () => void
  onRemove: () => void
}) {
  const isPost = item.resourceType === 'post'
  return (
    <li data-kb-item className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-1.5 text-footnote text-label-secondary">
        <Badge variant={isPost ? 'brand' : 'neutral'} size="xs">
          {isPost ? 'Story' : 'Comment'}
        </Badge>
        <span className="font-semibold text-down tabular">
          {item.reportCount} {item.reportCount === 1 ? 'report' : 'reports'}
        </span>
        <Dot />
        <time
          dateTime={item.lastReportedAt}
          title={formatDateTime(item.lastReportedAt)}
          suppressHydrationWarning
        >
          last {timeAgo(item.lastReportedAt).toLowerCase()}
        </time>
        {item.author && (
          <>
            <Dot />
            <span>
              by{' '}
              <Link
                to="/users/$userId"
                params={{ userId: item.author.id }}
                className="font-medium text-label hover:text-brand-text"
              >
                {item.author.name}
              </Link>
            </span>
          </>
        )}
      </div>

      <div className="mt-2">
        {!item.exists ? (
          <p className="text-subhead text-label-tertiary italic">Already deleted</p>
        ) : isPost ? (
          <Link
            to="/threads/$threadId"
            params={{ threadId: item.resourceId }}
            data-kb-action="open"
            className="text-callout font-semibold text-label hover:text-brand-text"
          >
            {item.postTitle}
          </Link>
        ) : (
          <>
            <p className="line-clamp-4 text-subhead whitespace-pre-line text-label">{item.body}</p>
            {item.postId && (
              <Link
                to="/threads/$threadId"
                params={{ threadId: item.postId }}
                hash={`comment-${item.resourceId}`}
                data-kb-action="open"
                className="mt-1 block truncate text-footnote text-label-secondary hover:text-brand-text"
              >
                on {item.postTitle ?? 'a deleted story'}
              </Link>
            )}
          </>
        )}
        {isPost && item.body && (
          <p className="mt-0.5 truncate text-footnote text-label-tertiary">{item.body}</p>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Reasons">
        {item.reasons.map(({ reason, count }) => (
          <li key={reason}>
            <Badge variant="neutral" size="md" className="font-medium">
              {reportReasonLabel(reason)}
              {count > 1 && <span className="text-label-tertiary tabular">×{count}</span>}
            </Badge>
          </li>
        ))}
      </ul>
      {item.notes.length > 0 && (
        <ul className="mt-2 space-y-1">
          {item.notes.slice(0, 3).map((note, i) => (
            <li key={i} className="rounded-xl bg-fill-secondary px-3 py-2 text-footnote text-label-secondary">
              “{note}”
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" disabled={busy} onClick={onDismiss}>
          <Check />
          {item.exists ? 'Keep it' : 'Close reports'}
        </Button>
        {item.exists && (
          <Button variant="destructive" size="sm" disabled={busy} onClick={onRemove}>
            <Trash2 />
            Remove
          </Button>
        )}
      </div>
    </li>
  )
}

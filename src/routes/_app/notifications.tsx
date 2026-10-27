import * as React from 'react'
import { useQuery, useQueryClient, useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Bell, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import { readNotifications, saveNotificationSettings } from '@/api/notifications'
import { notificationCountQuery, notificationSettingsQuery, notificationsQuery } from '@/lib/queries'
import { SITE_URL, seo } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { ColumnTitle } from '@/components/feed/feed-column'
import { FeedLayout } from '@/components/feed/feed-layout'
import { NotificationRow } from '@/components/notifications/notification-parts'

const TITLE = 'Notifications'

export const Route = createFileRoute('/_app/notifications')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: '/signin', search: { redirect: location.href } })
    return { user: context.user }
  },
  loader: ({ context }) => context.queryClient.ensureInfiniteQueryData(notificationsQuery(context.user.id)),
  head: () => ({
    meta: seo({ title: 'Notifications - Refetch', url: `${SITE_URL}/notifications`, noindex: true }),
  }),
  pendingComponent: NotificationsPending,
  component: NotificationsPage,
})

function NotificationsPage() {
  const { user } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const markRead = useServerFn(readNotifications)
  const query = useSuspenseInfiniteQuery(notificationsQuery(user.id))
  const notifications = query.data.pages.flatMap((page) => page.notifications)
  const hasUnread = notifications.some((notification) => !notification.read)

  // Opening the page reads everything; rows keep their unread tint until the next visit.
  React.useEffect(() => {
    if (!hasUnread) return
    void markRead({ data: {} })
      .then(() => queryClient.setQueryData(notificationCountQuery(user.id).queryKey, 0))
      .catch(() => {})
  }, [hasUnread, markRead, queryClient, user.id])

  const markAllRead = () => {
    queryClient.setQueryData(notificationsQuery(user.id).queryKey, (data) =>
      data
        ? {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              notifications: page.notifications.map((notification) => ({ ...notification, read: true })),
            })),
          }
        : data,
    )
  }

  return (
    <FeedLayout
      column={
        <ColumnTitle
          title={TITLE}
          subtitle="Replies, comments on your stories, new followers and milestones."
          actions={
            hasUnread && (
              <Button variant="ghost" size="sm" onClick={markAllRead}>
                <CheckCheck />
                <span className="max-sm:sr-only">Mark all read</span>
              </Button>
            )
          }
        />
      }
    >
      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell />}
          title="Nothing yet"
          description="When people reply to you, comment on your stories or follow you, you’ll see it here."
        />
      ) : (
        <ul className="divide-y divide-separator">
          {notifications.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} />
          ))}
        </ul>
      )}
      {query.hasNextPage && (
        <div className="border-t border-separator p-4 text-center">
          <Button
            variant="secondary"
            size="md"
            loading={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            Show older
          </Button>
        </div>
      )}
      <EmailSettings userId={user.id} />
    </FeedLayout>
  )
}

function EmailSettings({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const save = useServerFn(saveNotificationSettings)
  const settings = notificationSettingsQuery(userId)
  const { data } = useQuery(settings)
  const [saving, setSaving] = React.useState(false)
  if (!data) return null

  const onChange = async (value: 'on' | 'off') => {
    const email = value === 'on'
    setSaving(true)
    queryClient.setQueryData(settings.queryKey, () => ({ email }))
    try {
      const result = await save({ data: { email } })
      if (!result.ok) throw new Error(result.error)
      toast.success(email ? 'Email notifications on' : 'Email notifications off')
    } catch (error) {
      queryClient.setQueryData(settings.queryKey, () => ({ email: !email }))
      toast.error(error instanceof Error && error.message ? error.message : 'Couldn’t save that.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-separator px-4 py-4 sm:flex-row sm:items-center sm:px-5">
      <div className="min-w-0 flex-1">
        <h2 className="text-subhead font-semibold text-label">Email notifications</h2>
        <p className="text-footnote text-label-secondary">
          Replies, comments on your stories and new followers. At most one email every 10 minutes.
        </p>
      </div>
      <SegmentedControl
        aria-label="Email notifications"
        size="sm"
        className="w-40 shrink-0"
        value={data.email ? 'on' : 'off'}
        onValueChange={(value) => !saving && void onChange(value)}
        options={[
          { value: 'on', label: 'On' },
          { value: 'off', label: 'Off' },
        ]}
      />
    </div>
  )
}

function NotificationsPending() {
  return (
    <FeedLayout column={<ColumnTitle title={TITLE} />}>
      <ul aria-busy="true" aria-label="Loading notifications" className="divide-y divide-separator">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex gap-3 px-4 py-3.5 sm:px-5">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-4 rounded-full" style={{ width: `${55 + ((i * 13) % 35)}%` }} />
              <Skeleton className="h-3 w-24 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </FeedLayout>
  )
}

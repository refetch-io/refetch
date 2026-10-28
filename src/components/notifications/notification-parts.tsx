import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Bell, MessageCircle, Reply, TrendingUp, UserPlus } from 'lucide-react'
import { notificationCountQuery } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { notificationAction, notificationSentence, type AppNotification } from '@/lib/notifications'
import { cn, formatDateTime, timeAgo } from '@/lib/utils'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'
import { Tooltip } from '../ui/tooltip'
import { UnreadBadge } from '../messages/parts'

/** Unread notifications, for the bell. Polls while signed in. */
export function useNotificationCount() {
  const { user } = useSession()
  const { data } = useQuery({ ...notificationCountQuery(user?.id ?? ''), enabled: Boolean(user) })
  return user ? (data ?? 0) : 0
}

export function NotificationBell() {
  const count = useNotificationCount()
  return (
    <Tooltip content="Notifications" side="bottom">
      <Button asChild variant="ghost" size="icon-sm" className="relative">
        <Link
          to="/notifications"
          aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
          activeProps={{ className: 'text-brand-text' }}
        >
          <Bell />
          <UnreadBadge count={count} className="absolute -top-1 -right-1.5 ring-2 ring-bg" />
        </Link>
      </Button>
    </Tooltip>
  )
}

const TYPE_ICON = {
  comment: { icon: MessageCircle, className: 'bg-brand text-on-brand' },
  reply: { icon: Reply, className: 'bg-brand text-on-brand' },
  follow: { icon: UserPlus, className: 'bg-[#34c759] text-white' },
  milestone: { icon: TrendingUp, className: 'bg-up text-white' },
} as const

export function NotificationRow({ notification }: { notification: AppNotification }) {
  const { icon: Icon, className } = TYPE_ICON[notification.type]
  // Follows open the follower's profile; everything else opens the comment in its thread.
  const target =
    notification.type === 'follow' && notification.actor
      ? ({ to: '/users/$userId', params: { userId: notification.actor.id } } as const)
      : notification.postId
        ? ({
            to: '/threads/$threadId',
            params: { threadId: notification.postId },
            hash: notification.commentId ? `comment-${notification.commentId}` : undefined,
          } as const)
        : ({ to: '/' } as const)

  return (
    <li className="relative">
      <Link
        {...target}
        aria-label={notificationSentence(notification)}
        data-kb-item
        className={cn(
          'flex gap-3 px-4 py-3.5 transition-colors hover:bg-fill-secondary/60 sm:px-5',
          !notification.read && 'bg-brand-tint/40',
        )}
      >
        <span className="relative mt-0.5 shrink-0">
          {notification.actor ? (
            <Avatar name={notification.actor.name} userId={notification.actor.id} size={40} />
          ) : (
            <span className="grid size-10 place-items-center rounded-full bg-up-tint text-up">
              <TrendingUp className="size-5" strokeWidth={2.2} aria-hidden />
            </span>
          )}
          {notification.actor && (
            <span
              aria-hidden
              className={cn(
                'absolute -right-1 -bottom-1 grid size-[18px] place-items-center rounded-full ring-2 ring-surface',
                className,
              )}
            >
              <Icon className="size-2.5" strokeWidth={2.8} />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-subhead leading-snug text-label">
            {notification.actor && <span className="font-semibold">{notification.actor.name} </span>}
            {notificationAction(notification)}
            {notification.postTitle && notification.type !== 'follow' && (
              <>
                {notification.type === 'milestone' ? ': ' : ' on '}
                <span className="font-medium">{notification.postTitle}</span>
              </>
            )}
          </span>
          {notification.preview && (notification.type === 'comment' || notification.type === 'reply') && (
            <span className="mt-1 line-clamp-2 block text-footnote text-label-secondary">
              {notification.preview}
            </span>
          )}
          <time
            dateTime={notification.createdAt}
            title={formatDateTime(notification.createdAt)}
            className="mt-1 block text-caption-1 text-label-tertiary"
            suppressHydrationWarning
          >
            {timeAgo(notification.createdAt)}
          </time>
        </span>
        {!notification.read && (
          <span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-brand" />
        )}
      </Link>
    </li>
  )
}

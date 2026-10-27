import type { PersonSummary } from './types'

export type NotificationType = 'comment' | 'reply' | 'follow' | 'milestone'

export interface AppNotification {
  id: string
  type: NotificationType
  /** Who did it (null for milestones). */
  actor: PersonSummary | null
  postId: string | null
  postTitle: string | null
  commentId: string | null
  /** Comment excerpt, or the points reached for a milestone. */
  preview: string
  read: boolean
  createdAt: string
}

export interface NotificationPage {
  notifications: Array<AppNotification>
  /** Pass as `before` to load older notifications. */
  nextCursor: string | null
}

/** Points at which a story's author hears about it. */
export const STORY_MILESTONES = [10, 25, 50, 100, 250, 500, 1000] as const

/** The milestone a score change crossed going up, if any (the highest one). */
export function crossedMilestone(before: number, after: number): number | null {
  let crossed: number | null = null
  for (const milestone of STORY_MILESTONES) {
    if (before < milestone && after >= milestone) crossed = milestone
  }
  return crossed
}

/** What happened, after the actor's name ("replied to your comment"). */
export function notificationAction(notification: Pick<AppNotification, 'type' | 'preview'>): string {
  switch (notification.type) {
    case 'comment':
      return 'commented on your story'
    case 'reply':
      return 'replied to your comment'
    case 'follow':
      return 'started following you'
    case 'milestone':
      return `Your story reached ${notification.preview} points`
  }
}

/** One plain sentence, for email subjects and screen readers. */
export function notificationSentence(
  notification: Pick<AppNotification, 'type' | 'preview' | 'postTitle'> & { actor: { name: string } | null },
): string {
  const action = notificationAction(notification)
  const title = notification.postTitle ? ` “${notification.postTitle}”` : ''
  switch (notification.type) {
    case 'comment':
      return `${notification.actor?.name ?? 'Someone'} commented on${title || ' your story'}`
    case 'reply':
      return `${notification.actor?.name ?? 'Someone'} ${action}${title ? ` on${title}` : ''}`
    case 'follow':
      return `${notification.actor?.name ?? 'Someone'} ${action}`
    case 'milestone':
      return `${action}${title ? `:${title}` : ''}`
  }
}

/** Where a notification leads: the comment in its thread, the story, or the follower's profile. */
export function notificationHref(
  notification: Pick<AppNotification, 'type' | 'postId' | 'commentId' | 'actor'>,
): string {
  if (notification.type === 'follow' && notification.actor) return `/u/${notification.actor.id}`
  if (!notification.postId) return '/'
  const hash = notification.commentId ? `#comment-${notification.commentId}` : ''
  return `/threads/${notification.postId}${hash}`
}

/** A comment trimmed for a notification row or email. */
export function excerpt(text: string, max = 200): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat
}

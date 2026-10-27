import { trackAppwriteEvent } from './appwrite-analytics'
import { THREAD_EVENTS } from './thread-stats'

/* Single entry point for custom events (sent to Appwrite Analytics). */

type Props = Record<string, string | number | boolean>

export function trackEvent(name: string, props?: Props) {
  trackAppwriteEvent(name, props ? { props } : undefined)
}

/** Event names are kept stable so their history stays comparable. */
export function trackPostClick(postId: string, postTitle: string, isExternal: boolean) {
  trackEvent(isExternal ? 'main.posts.ExternalClick' : 'main.posts.InternalClick', {
    post_id: postId,
    post_title: postTitle,
    post_type: isExternal ? 'external' : 'internal',
  })
}

/* Recorded against the thread's URL (not the page it happened on), so per-thread stats can count them. */
function trackThreadEvent(postId: string, name: string, props: Props) {
  if (typeof window === 'undefined') return
  trackAppwriteEvent(name, { url: `${window.location.origin}/threads/${postId}`, props })
}

/** The story's article was opened (clicks and middle clicks, from a feed or the thread). */
export function trackArticleOpen(postId: string, source: 'feed' | 'thread') {
  trackThreadEvent(postId, THREAD_EVENTS.articleOpen, { source })
}

/** The story was shared: link copied, native share sheet, or sent in messages. */
export function trackStoryShare(postId: string, method: 'copy' | 'native' | 'message') {
  trackThreadEvent(postId, THREAD_EVENTS.share, { method })
}

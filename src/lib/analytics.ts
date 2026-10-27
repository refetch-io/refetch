import { trackAppwriteEvent } from './appwrite-analytics'

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

import { trackAppwriteEvent } from './appwrite-analytics'

/*
 * Single entry point for custom events, so Plausible and Appwrite Analytics
 * always see the same thing. Import from here rather than from either backend:
 * calling one directly is how the two drift apart.
 */

type Props = Record<string, string | number | boolean>
type PlausibleFn = (event: string, options?: { props?: Props }) => void

function plausible(): PlausibleFn | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { plausible?: PlausibleFn }).plausible
}

export function trackEvent(name: string, props?: Props) {
  plausible()?.(name, props ? { props } : undefined)
  trackAppwriteEvent(name, props ? { props } : undefined)
}

/** Same event names as before, so existing Plausible goals keep working. */
export function trackPostClick(postId: string, postTitle: string, isExternal: boolean) {
  trackEvent(isExternal ? 'main.posts.ExternalClick' : 'main.posts.InternalClick', {
    post_id: postId,
    post_title: postTitle,
    post_type: isExternal ? 'external' : 'internal',
  })
}

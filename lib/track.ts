/**
 * Single entry point for custom events, so Plausible and Appwrite Analytics
 * always see the same thing. Import from here rather than from either backend:
 * calling one directly is how the two drift apart.
 */
import * as appwrite from '@/lib/analytics'
import * as plausible from '@/lib/plausible'

export function trackPostClick(postId: string, postTitle: string, isExternal = false) {
  plausible.trackPostClick(postId, postTitle, isExternal)
  appwrite.trackPostClick(postId, postTitle, isExternal)
}

export function trackEvent(name: string, props?: Record<string, unknown>) {
  plausible.trackEvent(name, props)
  appwrite.trackEvent(name, { props })
}

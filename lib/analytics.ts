import { Analytics, AnalyticsTracking } from 'appwrite'
import type { AnalyticsEventOptions } from 'appwrite'

import { client } from './appwrite'

const propertyId = process.env.NEXT_PUBLIC_APPWRITE_ANALYTICS_PROPERTY_ID ?? ''

const analytics = new Analytics(client)

// `createEvent` wants the endpoint's shape: `url` is required, and `props` is a
// flat alternating key/value list rather than the object the tracker emits.
const tracking = propertyId
  ? new AnalyticsTracking(
      (name, options) =>
        analytics.createEvent({
          propertyId: options?.propertyId ?? propertyId,
          name,
          url: options?.url ?? window.location.href,
          referrer: options?.referrer,
          scrollDepth: options?.scrollDepth,
          engagementTime: options?.engagementTime,
          props: Object.entries(options?.props ?? {}).flatMap(([key, value]) => [
            key,
            String(value),
          ]),
        }),
      { propertyId },
    )
  : null

/** No-op until NEXT_PUBLIC_APPWRITE_ANALYTICS_PROPERTY_ID is set, so local and
 *  fork setups run without an analytics property. */
export const isAnalyticsEnabled = tracking !== null

export function startAutoTracking(): () => void {
  if (!tracking) return () => {}

  tracking.enableAllAutoTracking()
  // enableAllAutoTracking() covers pageviews, outbound links, scroll depth and
  // engagement time, but not downloads.
  tracking.enableAutoDownloadTracking()

  return () => {
    tracking.disableAutoPageviews()
    tracking.disableAutoOutboundTracking()
    tracking.disableAutoDownloadTracking()
    tracking.disableAutoScrollDepth()
    tracking.disableAutoEngagementTime()
  }
}

export function trackEvent(name: string, options?: AnalyticsEventOptions) {
  tracking?.track(name, options)
}

/** Mirrors `trackPostClick` in lib/plausible.ts so both backends see the same event. */
export function trackPostClick(postId: string, postTitle: string, isExternal = false) {
  trackEvent(isExternal ? 'main.posts.ExternalClick' : 'main.posts.InternalClick', {
    props: {
      post_id: postId,
      post_title: postTitle,
      post_type: isExternal ? 'external' : 'internal',
    },
  })
}

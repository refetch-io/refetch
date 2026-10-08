import { Analytics, Tracking } from 'appwrite'
import type { TrackingEventOptions } from 'appwrite'

import { client } from './appwrite'

// The property document ID. Shipping it to the browser is fine: ingestion is
// a public route, so the ID is not a secret.
const propertyId = process.env.NEXT_PUBLIC_APPWRITE_ANALYTICS_PROPERTY_ID ?? ''

const analytics = new Analytics(client)

// The same hosts `lib/plausible.ts` gates on, so a preview or local build that
// happens to carry a property id does not pollute production stats.
const PRODUCTION_HOSTS = ['refetch.io', 'www.refetch.io']

const isProductionHost = () =>
  typeof window !== 'undefined' && PRODUCTION_HOSTS.includes(window.location.hostname)

// Built on first use rather than at module scope: the host gate needs `window`,
// which is absent in the SSR pass.
let tracking: Tracking | null | undefined

function getTracking(): Tracking | null {
  if (tracking === undefined) {
    tracking =
      propertyId && isProductionHost()
        ? // Plausible here is the plain script.js, which ignores DNT. Respecting
          // it on only one of the two backends would skew every comparison.
          new Tracking(analytics, propertyId, { respectDoNotTrack: false })
        : null
  }

  return tracking
}

/** No-op until NEXT_PUBLIC_APPWRITE_ANALYTICS_PROPERTY_ID is set, so local and
 *  fork setups run without an analytics property. */
export const isAnalyticsEnabled = propertyId !== ''

export function startAutoTracking(): () => void {
  const tracker = getTracking()
  if (!tracker) return () => {}

  tracker.start()
  // start() covers pageviews, outbound links, scroll depth and engagement
  // time, but not downloads.
  tracker.enableAutoDownloadTracking()

  return () => {
    tracker.disableAutoPageviews()
    tracker.disableAutoOutboundTracking()
    tracker.disableAutoDownloadTracking()
    tracker.disableAutoScrollDepth()
    tracker.disableAutoEngagementTime()
  }
}

export function trackEvent(name: string, options?: TrackingEventOptions) {
  getTracking()?.track(name, options)
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

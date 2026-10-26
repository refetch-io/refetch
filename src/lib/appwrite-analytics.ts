import type { Tracking, TrackingEventOptions } from 'appwrite'

/*
 * Appwrite Analytics (browser only). The SDK loads lazily on the first call so
 * it stays out of the server render and the initial bundle. Tracking only runs
 * on production hosts with a property ID, so previews and local builds don't
 * pollute production stats.
 */

const PRODUCTION_HOSTS = ['refetch.io', 'www.refetch.io']

export interface AnalyticsConfig {
  appwriteEndpoint: string
  appwriteProjectId: string
  analyticsPropertyId: string
}

let tracking: Promise<Tracking | null> | null = null

function getTracking(config?: AnalyticsConfig): Promise<Tracking | null> {
  if (tracking) return tracking
  if (!config) return Promise.resolve(null)
  if (
    typeof window === 'undefined' ||
    !config.analyticsPropertyId ||
    !PRODUCTION_HOSTS.includes(window.location.hostname)
  ) {
    tracking = Promise.resolve(null)
    return tracking
  }
  tracking = import('appwrite').then(({ Analytics, Client, Tracking }) => {
    const client = new Client().setEndpoint(config.appwriteEndpoint).setProject(config.appwriteProjectId)
    // Plausible's script ignores Do Not Track; respecting it on only one of the
    // two backends would skew every comparison between them.
    return new Tracking(new Analytics(client), config.analyticsPropertyId, { respectDoNotTrack: false })
  })
  return tracking
}

/** Pageviews, outbound links, scroll depth, engagement time and downloads. Returns a cleanup. */
export function startAutoTracking(config: AnalyticsConfig): () => void {
  let stopped = false
  let started: Tracking | null = null
  void getTracking(config).then((tracker) => {
    if (!tracker || stopped) return
    tracker.start()
    tracker.enableAutoDownloadTracking()
    started = tracker
  })
  return () => {
    stopped = true
    started?.disableAutoPageviews()
    started?.disableAutoOutboundTracking()
    started?.disableAutoDownloadTracking()
    started?.disableAutoScrollDepth()
    started?.disableAutoEngagementTime()
  }
}

/** Custom event; a no-op until auto-tracking has been configured. */
export function trackAppwriteEvent(name: string, options?: TrackingEventOptions) {
  void getTracking().then((tracker) => tracker?.track(name, options))
}

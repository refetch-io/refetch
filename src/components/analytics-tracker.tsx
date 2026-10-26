import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { configQuery } from '@/lib/queries'
import { startAutoTracking } from '@/lib/appwrite-analytics'

/**
 * Starts Appwrite Analytics auto-tracking for the session. Renders nothing,
 * and does nothing without a property ID or off the production hosts.
 */
export function AnalyticsTracker() {
  const { data: config } = useQuery(configQuery())
  React.useEffect(() => (config ? startAutoTracking(config) : undefined), [config])
  return null
}

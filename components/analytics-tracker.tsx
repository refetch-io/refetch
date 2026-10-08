"use client"

import { useEffect } from 'react';
import { startAutoTracking } from '@/lib/analytics';

/**
 * Starts Appwrite Analytics auto-tracking for the session. Renders nothing and
 * is a no-op unless NEXT_PUBLIC_APPWRITE_ANALYTICS_PROPERTY_ID is set.
 */
export function AnalyticsTracker() {
  useEffect(() => startAutoTracking(), []);

  return null;
}

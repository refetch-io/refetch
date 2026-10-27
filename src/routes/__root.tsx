import * as React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import appCss from '@/styles/app.css?url'
import { configQuery, sessionQuery } from '@/lib/queries'
import { SITE_URL, seo } from '@/lib/seo'
import { ThemeProvider, themeScript } from '@/lib/theme'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NavigationProgress } from '@/components/layout/navigation'
import { AnalyticsTracker } from '@/components/analytics-tracker'

const PLAUSIBLE_QUEUE =
  'window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}'

/** Hardening carried over from the previous deployment (ClearFake / EtherHiding injects). */
const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://plausible.io",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // Appwrite Analytics ingestion goes to the project's Cloud endpoint.
    "connect-src 'self' https://plausible.io https://*.appwrite.io",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ context }) => {
    const [user] = await Promise.all([
      context.queryClient.ensureQueryData(sessionQuery()),
      context.queryClient.ensureQueryData(configQuery()),
    ])
    return { user }
  },
  headers: () => (import.meta.env.PROD ? SECURITY_HEADERS : {}),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#f5f5f7' },
      { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#0e0d13' },
      { name: 'apple-mobile-web-app-title', content: 'Refetch' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'application-name', content: 'Refetch' },
      {
        name: 'keywords',
        content: 'tech news, hacker news alternative, technology, startups, programming, open source',
      },
      ...seo({ title: 'Refetch: Open-source alternative to YC-controlled HN', url: SITE_URL }),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/png', href: '/favicon.png' },
      { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
    ],
    scripts: [
      { children: PLAUSIBLE_QUEUE },
      { src: 'https://plausible.io/js/script.js', defer: true, 'data-domain': 'refetch.io' },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        {/* Providers live in the shell so error and 404 screens get them too. */}
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}

/** Installable app + offline page (public/sw.js). Production only: dev assets aren't fingerprinted. */
function useServiceWorker() {
  React.useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.warn('[sw] registration failed', error)
    })
  }, [])
}

function RootComponent() {
  useServiceWorker()
  return (
    <>
      <NavigationProgress />
      <AnalyticsTracker />
      <Outlet />
    </>
  )
}

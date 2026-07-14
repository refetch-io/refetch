import { Outlet, useRouterState } from '@tanstack/react-router'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { isDocsPath } from '@/components/layout/nav-config'
import { ShellHeader } from '@/components/layout/shell-header'
import { SidebarPrefsProvider } from '@/components/layout/sidebar-prefs-provider'
import { PresenceSync } from '@/components/presence-sync'
import { SiteFooter } from '@/components/site-footer'
import { OnlinePresenceProvider } from '@/contexts/online-presence-context'
import type { AccountPreview } from '@/lib/auth-cookie'
import { SidebarInset } from '@/components/ui/sidebar'

const AUTH_PATHS = new Set(['/signin', '/signup'])
const FULLSCREEN_PATHS = new Set(['/submit'])

export function AppShell({
  defaultSidebarOpen = true,
  defaultSignedIn = false,
  defaultAccount = null,
}: {
  defaultSidebarOpen?: boolean
  defaultSignedIn?: boolean
  defaultAccount?: AccountPreview | null
}) {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  })

  if (AUTH_PATHS.has(pathname)) {
    return <Outlet />
  }

  if (FULLSCREEN_PATHS.has(pathname)) {
    return (
      <>
        <PresenceSync />
        <Outlet />
      </>
    )
  }

  const docs = isDocsPath(pathname)

  return (
    <SidebarPrefsProvider defaultOpen={defaultSidebarOpen}>
      <OnlinePresenceProvider>
        <PresenceSync />
        <AppSidebar
          defaultSignedIn={defaultSignedIn}
          defaultAccount={defaultAccount}
        />
        <SidebarInset className="max-h-svh overflow-hidden">
          <ShellHeader defaultSignedIn={defaultSignedIn} />
          {docs ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <Outlet />
            </div>
          ) : (
            <div
              data-app-scroll
              data-scroll-restoration-id="app-main"
              className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-none"
            >
              <div className="flex min-h-full flex-1 flex-col pt-6 pb-0">
                <div className="flex-1">
                  <Outlet />
                </div>
                <div className="mt-auto w-full px-8 pt-12 sm:px-12 lg:px-16">
                  <SiteFooter />
                </div>
              </div>
            </div>
          )}
        </SidebarInset>
      </OnlinePresenceProvider>
    </SidebarPrefsProvider>
  )
}

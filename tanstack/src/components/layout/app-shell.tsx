import { Outlet } from '@tanstack/react-router'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { ShellHeader } from '@/components/layout/shell-header'
import { PresenceSync } from '@/components/presence-sync'
import { SiteFooter } from '@/components/site-footer'
import { OnlinePresenceProvider } from '@/contexts/online-presence-context'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export function AppShell() {
  return (
    <SidebarProvider>
      <OnlinePresenceProvider>
        <PresenceSync />
        <AppSidebar />
        <SidebarInset className="max-h-svh overflow-hidden">
          <ShellHeader />
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-none">
            <div className="flex flex-1 flex-col gap-8 py-6">
              <Outlet />
              <div className="w-full px-4 sm:px-6">
                <SiteFooter />
              </div>
            </div>
          </div>
        </SidebarInset>
      </OnlinePresenceProvider>
    </SidebarProvider>
  )
}

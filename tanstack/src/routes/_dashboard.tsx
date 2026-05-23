import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export const Route = createFileRoute("/_dashboard")({
  component: DashboardLayout,
})

function DashboardLayout() {
  const matches = useMatches()
  const title =
    [...matches].reverse().find((match) => match.staticData?.title)?.staticData
      ?.title ?? "Documents"

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={title} />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}

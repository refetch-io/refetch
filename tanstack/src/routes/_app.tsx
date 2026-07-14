import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/app-shell'
import { getSidebarOpenFromRequest } from '@/lib/sidebar-prefs.functions'

export const Route = createFileRoute('/_app')({
  loader: () => getSidebarOpenFromRequest(),
  component: AppLayout,
})

function AppLayout() {
  const sidebarOpen = Route.useLoaderData()
  return <AppShell defaultSidebarOpen={sidebarOpen} />
}

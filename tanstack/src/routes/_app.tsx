import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/app-shell'
import { getAppShellHints } from '@/lib/shell-hints.functions'

export const Route = createFileRoute('/_app')({
  loader: () => getAppShellHints(),
  component: AppLayout,
})

function AppLayout() {
  const { sidebarOpen, signedIn, account } = Route.useLoaderData()
  return (
    <AppShell
      defaultSidebarOpen={sidebarOpen}
      defaultSignedIn={signedIn}
      defaultAccount={account}
    />
  )
}

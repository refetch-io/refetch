import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { AppHeader } from '@/components/layout/header'
import { Sidebar, TabBar } from '@/components/layout/navigation'
import { CommandCenterProvider } from '@/components/command-center'
import { channelDirectoryQuery, githubStarsQuery, trendingTopicsQuery } from '@/lib/queries'

/** Longest the first render waits for shell widgets (both are cached on the server). */
const WIDGET_WAIT_MS = 300

export const Route = createFileRoute('/_app')({
  loader: async ({ context }) => {
    // The header's star count and the rail's trending topics render with the
    // page so they don't pop in, but a slow upstream never holds the page.
    const widgets = Promise.all([
      context.queryClient.ensureQueryData(githubStarsQuery()).catch(() => null),
      context.queryClient.ensureQueryData(trendingTopicsQuery()).catch(() => null),
    ])
    await Promise.all([
      // Channel names and memberships are used across the shell (sidebar, post tags).
      context.queryClient.ensureQueryData(channelDirectoryQuery(context.user?.id ?? null)),
      Promise.race([widgets, new Promise((resolve) => setTimeout(resolve, WIDGET_WAIT_MS))]),
    ])
  },
  component: AppLayout,
})

function AppLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  // Thread pages use the bottom of the screen for the comment composer, and
  // messages fill the screen like an app, so neither shows the tab bar.
  const isThread = pathname.startsWith('/threads/')
  const isMessages = pathname === '/messages' || pathname.startsWith('/messages/')

  return (
    <CommandCenterProvider>
      <>
        <div className="min-h-dvh">
          <a
            href="#main"
            className="sr-only z-50 rounded-full bg-brand px-4 py-2 text-footnote font-semibold text-on-brand focus:not-sr-only focus:fixed focus:top-3 focus:left-4"
          >
            Skip to content
          </a>
          <AppHeader />
          <div className="mx-auto flex max-w-[1320px] gap-8 px-4 lg:px-6">
            <Sidebar />
            <main
              id="main"
              className={
                isMessages
                  ? 'min-w-0 flex-1 lg:py-6'
                  : isThread
                    ? 'min-w-0 flex-1 pt-4 sm:pt-6'
                    : 'min-w-0 flex-1 pt-5 pb-28 sm:pt-7 lg:pt-6 lg:pb-16'
              }
            >
              <Outlet />
            </main>
          </div>
          {!isThread && !isMessages && <TabBar />}
        </div>
      </>
    </CommandCenterProvider>
  )
}

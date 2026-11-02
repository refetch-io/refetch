import { QueryClient } from '@tanstack/react-query'
import { createRouter, isNotFound, isRedirect } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'
import { NotFound, RouteError } from './components/route-states'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Retry flaky network errors once in the browser; never retry 404s/redirects.
        retry: (failureCount, error) =>
          typeof window !== 'undefined' && failureCount < 1 && !isNotFound(error) && !isRedirect(error),
      },
    },
  })

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    // React Query owns caching; let the router always ask it.
    defaultPreloadStaleTime: 0,
    defaultViewTransition: true,
    defaultPendingMs: 250,
    defaultPendingMinMs: 300,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: RouteError,
  })

  observeViewTransitions(router)
  setupRouterSsrQueryIntegration({ router, queryClient })
  return router
}

/**
 * The router keeps only `updateCallbackDone` from each view transition, so when a newer
 * navigation skips one (or the tab hides mid-way) its `ready` promise rejects unobserved:
 * "Transition was skipped/aborted" in the console. Observe them; navigation is unaffected.
 */
function observeViewTransitions(router: { startViewTransition: (fn: () => Promise<void>) => unknown }) {
  if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function') return
  const startViewTransition = router.startViewTransition
  router.startViewTransition = (fn) => {
    const start = document.startViewTransition
    document.startViewTransition = function (this: Document, ...args: Parameters<typeof start>) {
      const transition = start.apply(this, args)
      transition.ready.catch(() => {})
      transition.finished.catch(() => {})
      return transition
    }
    try {
      return startViewTransition(fn)
    } finally {
      document.startViewTransition = start
    }
  }
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

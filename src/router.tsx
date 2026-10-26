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

  setupRouterSsrQueryIntegration({ router, queryClient })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { SiteFooter } from '@/components/site-footer'

export const Route = createFileRoute('/_app/docs')({
  component: DocsLayout,
})

function DocsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isApiReference = pathname === '/docs/api'

  if (isApiReference) {
    return <Outlet />
  }

  return (
    <div
      data-app-scroll
      data-scroll-restoration-id="docs-main"
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
  )
}

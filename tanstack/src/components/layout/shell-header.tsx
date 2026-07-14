import { Link, useRouterState } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { CommandCenter } from '@/components/layout/command-center'
import { isAccountPath } from '@/components/account/account-nav'
import {
  isDocsPath,
  resolvePageTitle,
} from '@/components/layout/nav-config'
import { RefetchMark } from '@/components/refetch-logo'
import { useAuth } from '@/contexts/auth-context'

export function ShellHeader({
  defaultSignedIn = false,
}: {
  defaultSignedIn?: boolean
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { isAuthenticated, loading } = useAuth()
  const title = resolvePageTitle(pathname)
  // Prefer SSR cookie hint while auth resolves so Submit vs Sign in doesn't flash.
  const showSignedIn = loading ? defaultSignedIn : isAuthenticated

  return (
    <header className="z-20 grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-border bg-background px-3 sm:gap-3 sm:px-4 md:grid-cols-[minmax(0,1fr)_minmax(0,28rem)_minmax(0,1fr)]">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Link
          to="/"
          aria-label="Refetch home"
          className="shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <RefetchMark className="size-5" />
        </Link>
        <Separator
          orientation="vertical"
          className="mr-1 hidden data-vertical:h-4 data-vertical:self-center md:block"
        />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink asChild>
                <Link to="/">Refetch</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            {isDocsPath(pathname) && pathname !== '/docs' ? (
              <>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link to="/docs">Docs</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </>
            ) : null}
            {isAccountPath(pathname) &&
            pathname !== '/account' &&
            pathname !== '/account/' ? (
              <>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link to="/account">Account</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </>
            ) : null}
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex justify-end md:justify-center">
        <CommandCenter />
      </div>

      <div className="flex items-center justify-end gap-1.5">
        {showSignedIn ? (
          <Button
            size="icon-lg"
            className="sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3"
            asChild
          >
            <Link to="/submit" aria-label="Submit">
              <Plus />
              <span className="hidden sm:inline">Submit</span>
            </Link>
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="lg" className="px-2.5 sm:px-3" asChild>
              <Link to="/signin" search={{}}>
                Sign in
              </Link>
            </Button>
            <Button size="lg" className="px-2.5 sm:px-3" asChild>
              <Link to="/signup" search={{}}>
                Sign up
              </Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}

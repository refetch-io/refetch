import { Link, useRouterState } from '@tanstack/react-router'
import { Menu, Plus } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'
import { CommandCenter } from '@/components/layout/command-center'
import { isAccountPath } from '@/components/account/account-nav'
import {
  isDocsPath,
  resolvePageTitle,
} from '@/components/layout/nav-config'
import { RefetchMark, RefetchWordmark } from '@/components/refetch-logo'
import { useAuth } from '@/contexts/auth-context'

export function ShellHeader({
  defaultSignedIn = false,
}: {
  defaultSignedIn?: boolean
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { isAuthenticated, loading } = useAuth()
  const { setOpenMobile } = useSidebar()
  const title = resolvePageTitle(pathname)
  // Prefer SSR cookie hint while auth resolves so Submit vs Sign in doesn't flash.
  const showSignedIn = loading ? defaultSignedIn : isAuthenticated

  return (
    <header className="relative z-30 flex h-14 w-full shrink-0 items-center border-b border-border bg-background px-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 md:hidden"
          aria-label="Open menu"
          onClick={() => setOpenMobile(true)}
        >
          <Menu />
        </Button>
        <Link
          to="/"
          aria-label="Refetch home"
          className="flex shrink-0 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefetchMark className="size-5 sm:hidden" />
          <RefetchWordmark className="hidden h-5 w-[90px] sm:block" />
        </Link>
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbSeparator />
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

      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 flex w-full max-w-[min(28rem,calc(100%-12rem))] -translate-x-1/2 items-center px-2 sm:max-w-[min(28rem,calc(100%-18rem))]">
        <div className="pointer-events-auto flex w-full justify-center md:justify-stretch">
          <CommandCenter />
        </div>
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 items-center justify-end gap-1.5">
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

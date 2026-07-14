import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { AccountSubmenu } from '@/components/account/account-submenu'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/account')({
  component: AccountLayout,
})

function AccountLayout() {
  const { user, loading, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate({ to: '/signin' })
  }, [loading, isAuthenticated, navigate])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const root = sentinel.closest('[data-app-scroll]')
    const observer = new IntersectionObserver(
      ([entry]) => {
        setStuck(!entry.isIntersecting)
      },
      { root, threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [user, loading])

  if (loading || !user) {
    return (
      <main className="flex min-w-0 justify-center px-8 py-16 sm:px-12 lg:px-16">
        <Spinner />
      </main>
    )
  }

  return (
    <main className="flex min-w-0 flex-col">
      <div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden />

      <div
        className={cn(
          'sticky top-0 z-20 bg-background/95 backdrop-blur-md transition-shadow duration-200',
          stuck && 'shadow-sm',
        )}
      >
        <div className="px-8 sm:px-12 lg:px-16">
          <div
            className={cn(
              'mx-auto flex w-full max-w-5xl flex-col transition-[gap,padding] duration-200',
              stuck ? 'gap-0 py-2.5' : 'gap-1.5 pb-6',
            )}
          >
            <h1
              className={cn(
                'font-heading font-semibold tracking-tight transition-[font-size,line-height] duration-200',
                stuck ? 'text-base leading-tight' : 'text-2xl',
              )}
            >
              Account
            </h1>
            <p
              className={cn(
                'overflow-hidden text-sm text-muted-foreground transition-[max-height,opacity,margin] duration-200',
                stuck
                  ? 'mt-0 max-h-0 opacity-0'
                  : 'max-h-10 opacity-100',
              )}
            >
              Manage your profile, privacy, API keys, and security.
            </p>
          </div>
        </div>
        <Separator />
      </div>

      <div className="px-8 pt-6 sm:px-12 lg:px-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:gap-10">
          <aside className="w-full shrink-0 md:w-44 lg:w-52">
            <div
              className={cn(
                'md:sticky md:z-10',
                stuck ? 'md:top-14' : 'md:top-6',
              )}
            >
              <AccountSubmenu />
            </div>
          </aside>
          <div className="min-w-0 flex-1">
            <Outlet />
          </div>
        </div>
      </div>
    </main>
  )
}

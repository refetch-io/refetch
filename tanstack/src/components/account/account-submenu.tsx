import { Link, useRouterState } from '@tanstack/react-router'
import {
  ACCOUNT_NAV,
  isAccountNavActive,
} from '@/components/account/account-nav'
import { cn } from '@/lib/utils'

export function AccountSubmenu() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      aria-label="Account sections"
      className="flex gap-1 overflow-x-auto pb-0.5 md:flex-col md:overflow-visible md:pb-0"
    >
      {ACCOUNT_NAV.map((item) => {
        const active = isAccountNavActive(pathname, item.to)
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors md:w-full',
              active
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            )}
          >
            <item.icon className="size-3.5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

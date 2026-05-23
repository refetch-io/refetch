import { ChevronDown } from "lucide-react"

import { SiteLogo } from "@/components/site/site-logo"
import { SiteSearch } from "@/components/site/site-search"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type SiteNavLink = {
  label: string
  href: string
  dropdown?: boolean
}

type SiteNavProps = {
  links: SiteNavLink[]
  className?: string
}

export function SiteNav({ links, className }: SiteNavProps) {
  return (
    <nav
      className={cn(
        "relative z-20 flex items-center gap-4 px-4 py-3 md:px-6 md:py-4",
        className,
      )}
    >
      <a href="/about" className="flex shrink-0 items-center">
        <SiteLogo />
      </a>

      <ul className="ml-4 hidden min-w-0 flex-1 items-center gap-0.5 overflow-hidden lg:flex xl:ml-6">
        {links.map((link) => (
          <li key={link.label} className="shrink-0">
            <a
              href={link.href}
              className="text-foreground/80 hover:text-foreground inline-flex items-center gap-0.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted xl:px-3"
            >
              {link.label}
              {link.dropdown ? <ChevronDown className="size-3.5 opacity-70" /> : null}
            </a>
          </li>
        ))}
      </ul>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <SiteSearch className="hidden md:block" />

        <Button variant="brand-outline" size="pill-sm">
          Log In
        </Button>

        <Button variant="brand" size="pill-sm">
          Sign Up
        </Button>
      </div>
    </nav>
  )
}

export const ABOUT_NAV_LINKS: SiteNavLink[] = [
  { label: "Popular", href: "/feed" },
  { label: "Communities", href: "#communities" },
  { label: "Refetch Pro", href: "#pro" },
  { label: "Advertise", href: "#advertise" },
  { label: "About", href: "/about" },
]

export const FEED_NAV_LINKS: SiteNavLink[] = [
  { label: "Popular", href: "/feed" },
  { label: "Communities", href: "#communities" },
  { label: "Resources", href: "#resources", dropdown: true },
  { label: "Refetch Pro", href: "#pro" },
  { label: "Advertise", href: "#advertise" },
  { label: "About", href: "/about" },
]

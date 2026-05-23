import { ChevronDown, Search } from "lucide-react"

import { Button } from "@/components/ui/button"

type NavLink = { label: string; href: string; hasDropdown?: boolean }

const NAV_LINKS: NavLink[] = [
  { label: "Popular", href: "#popular" },
  { label: "Communities", href: "#communities" },
  { label: "Resources", href: "#resources", hasDropdown: true },
  { label: "Refetch Pro", href: "#pro" },
  { label: "Advertise", href: "#advertise" },
  { label: "About", href: "#about" },
]

export function LandingNav() {
  return (
    <nav className="relative z-20 flex items-center gap-4 px-4 py-3 md:px-6 md:py-4">
      <a href="/" className="flex shrink-0 items-center">
        <img
          src="/refetch-logo.png?v=2"
          alt="Refetch"
          width={735}
          height={164}
          className="h-[27px] w-auto select-none object-contain object-left md:h-[30.5px]"
          draggable={false}
        />
      </a>

      <ul className="ml-6 hidden items-center gap-1 lg:flex">
        {NAV_LINKS.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="text-foreground/80 hover:text-foreground inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/[0.04]"
            >
              {link.label}
              {link.hasDropdown ? (
                <ChevronDown className="size-3.5 opacity-70" />
              ) : null}
            </a>
          </li>
        ))}
      </ul>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search Refetch"
            className="bg-card/70 placeholder:text-muted-foreground/80 focus-visible:ring-ring/40 h-9 w-64 rounded-full border border-white/[0.08] pr-3 pl-9 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-offset-0"
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-white/[0.06] h-9 rounded-full px-4 text-sm font-medium"
        >
          Log In
        </Button>

        <Button
          size="sm"
          className="bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90 h-9 rounded-full px-4 text-sm font-medium shadow-[0_0_0_1px_color-mix(in_oklch,var(--brand)_30%,transparent)]"
        >
          Sign Up
        </Button>
      </div>
    </nav>
  )
}

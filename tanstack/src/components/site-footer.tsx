import { Link } from '@tanstack/react-router'
import { RefetchWordmark } from '@/components/refetch-logo'

const FOOTER_LINKS = [
  {
    href: 'https://github.com/refetch-io/refetch',
    label: 'About',
    external: true,
  },
  {
    href: '/docs',
    label: 'Docs',
    external: false,
  },
  {
    href: 'https://github.com/refetch-io/refetch/tree/main/functions/algorithm',
    label: 'Algorithm',
    external: true,
  },
  {
    href: 'https://appwrite.io/terms',
    label: 'Terms',
    external: true,
  },
  {
    href: 'https://appwrite.io/privacy',
    label: 'Privacy',
    external: true,
  },
  {
    href: 'https://appwrite.io/docs/advanced/security',
    label: 'Security',
    external: true,
  },
] as const

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-2 border-t border-border pt-8 pb-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <RefetchWordmark className="h-5 w-[90px]" />
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Your daily drop of curated tech news - signal over noise. Transparent.
            Community-driven.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-xs text-muted-foreground">
          {FOOTER_LINKS.map((link, index) => (
            <span key={link.href} className="inline-flex items-center gap-2.5">
              {index > 0 ? (
                <span className="text-border" aria-hidden>
                  ·
                </span>
              ) : null}
              {link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  to={link.href as '/docs'}
                  className="transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              )}
            </span>
          ))}

          <span className="text-border" aria-hidden>
            ·
          </span>
          <a
            href="https://github.com/sponsors/refetch-io"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-muted px-2 py-1 font-medium text-foreground/80 transition-colors hover:bg-muted/80 hover:text-foreground"
          >
            Donate
          </a>

          <span className="text-border" aria-hidden>
            ·
          </span>
          <span className="inline-flex items-center gap-2">
            <a
              href="https://x.com/refetch_io"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Refetch on X"
              className="text-foreground/80 transition-colors hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </a>
            <a
              href="https://github.com/refetch-io/refetch"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Refetch on GitHub"
              className="text-foreground/80 transition-colors hover:text-foreground"
            >
              <GitHubIcon className="size-3.5" />
            </a>
          </span>

          <span className="text-border" aria-hidden>
            ·
          </span>
          <a
            href="https://appwrite.io"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Powered by Appwrite
          </a>
        </div>

        <p className="text-xs text-muted-foreground/80">
          Copyright © {year} Refetch
        </p>
      </div>
    </footer>
  )
}

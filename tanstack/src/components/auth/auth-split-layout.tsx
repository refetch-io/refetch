import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { RefetchLogo } from '@/components/refetch-logo'
import type { AuthQuote } from '@/lib/auth-quotes'

type AuthSplitLayoutProps = {
  quote: AuthQuote
  children: ReactNode
}

export function AuthSplitLayout({ quote, children }: AuthSplitLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between bg-brand p-10 text-brand-foreground lg:flex">
        <Link
          to="/"
          className="relative z-10 inline-flex w-fit items-center opacity-95 transition-opacity hover:opacity-100"
        >
          <RefetchLogo className="h-8 w-auto text-brand-foreground" />
        </Link>

        <blockquote className="relative z-10 max-w-lg">
          <p className="font-heading text-3xl leading-snug font-semibold tracking-tight text-balance xl:text-4xl">
            “{quote.text}”
          </p>
          <footer className="mt-6 text-sm font-medium text-brand-foreground/70">
            - {quote.attribution}
          </footer>
        </blockquote>
      </aside>

      <main className="flex flex-col bg-background">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 lg:hidden">
          <Link to="/" className="inline-flex items-center">
            <RefetchLogo className="h-7 w-auto" />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  )
}

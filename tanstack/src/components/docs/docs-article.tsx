import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function DocsArticle({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <article
      className={cn(
        'mx-auto w-full max-w-3xl px-8 pt-2 pb-16 sm:px-12 lg:px-16',
        className,
      )}
    >
      <header className="mb-8 flex flex-col gap-2 border-b border-border pb-6">
        <h1 className="font-sans text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </header>
      <div className="flex flex-col gap-8 text-sm leading-relaxed">{children}</div>
    </article>
  )
}

export function DocsSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-sans text-base font-semibold tracking-tight">{title}</h2>
      <div className="flex flex-col gap-3 text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  )
}

export function DocsCode({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 font-mono text-[12px] leading-relaxed text-foreground">
      <code>{children}</code>
    </pre>
  )
}

export function DocsInlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground">
      {children}
    </code>
  )
}

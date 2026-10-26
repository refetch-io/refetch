import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { feedQuery } from '@/lib/queries'
import { safeRedirect } from '@/lib/redirect'
import { Logo } from '@/components/logo'
import { Favicon } from '@/components/favicon'

export const authSearchSchema = z.object({
  redirect: z.string().max(512).optional().catch(undefined),
  /** A story a visitor tried to open while signed out; shown above the form. */
  story: z.string().max(64).optional().catch(undefined),
  oauth: z.string().max(32).optional().catch(undefined),
  error: z.string().max(2048).optional().catch(undefined),
})

export const Route = createFileRoute('/_auth')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ context, search }) => {
    // Already signed in? Continue to wherever they were headed.
    if (context.user) throw redirect({ href: safeRedirect(search.redirect) })
  },
  loader: ({ context }) => {
    // Warm the headline preview without blocking the form.
    void context.queryClient.prefetchQuery(feedQuery('top', 1, null))
  },
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <BrandPanel />
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-5 py-4 lg:hidden">
          <Link to="/" aria-label="Refetch home">
            <Logo className="h-[22px] w-auto" />
          </Link>
        </header>
        <main className="grid flex-1 place-items-center px-5 pt-4 pb-12 lg:py-12">
          <div className="w-full max-w-[400px] animate-rise-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

/** Left-hand brand moment with a live peek at today's top stories. */
function BrandPanel() {
  const { data } = useQuery(feedQuery('top', 1, null))
  const headlines = data?.posts.slice(0, 3) ?? []

  return (
    <aside className="relative hidden overflow-hidden border-r border-separator bg-surface p-10 lg:flex lg:flex-col xl:p-14">
      {/* Soft brand light, kept away from the logo so it always reads in its own purple. */}
      <div
        aria-hidden
        className="absolute top-[28%] -left-48 size-[600px] rounded-full bg-brand/20 blur-[120px] dark:bg-brand/45"
      />
      <div
        aria-hidden
        className="absolute -right-40 -bottom-56 size-[560px] rounded-full bg-brand-2/15 blur-[120px] dark:bg-brand-2/25"
      />

      <Link to="/" className="relative w-fit" aria-label="Refetch home">
        <Logo className="h-7 w-auto" />
      </Link>

      <div className="relative mt-auto max-w-lg">
        <h2 className="text-[clamp(2.5rem,4vw,3.5rem)] leading-[1.05] font-bold tracking-[-0.035em] text-label">
          Signal over noise.
        </h2>
        <p className="mt-4 max-w-md text-callout leading-relaxed text-label-secondary">
          Your daily drop of curated tech news. Transparent ranking, community discussions, and fully open
          source.
        </p>

        <div className="mt-10 space-y-3">
          <p className="text-caption-1 font-semibold tracking-[0.1em] text-label-tertiary uppercase">
            Trending now
          </p>
          {/* One quiet grouped list: the headlines are the content, not the chrome. */}
          <ol className="overflow-hidden rounded-2xl bg-surface/60 ring-1 ring-separator backdrop-blur-xl">
            {headlines.length === 0
              ? Array.from({ length: 3 }, (_, i) => (
                  <li key={i} className="flex items-center gap-3.5 px-4 py-3.5">
                    <span className="h-3 w-3 rounded-full bg-fill" />
                    <span className="flex-1 space-y-2">
                      <span className="block h-3 w-4/5 rounded-full bg-fill" />
                      <span className="block h-2.5 w-1/3 rounded-full bg-fill-secondary" />
                    </span>
                  </li>
                ))
              : headlines.map((post, index) => (
                  <li
                    key={post.id}
                    className="animate-rise-in border-separator not-first:border-t"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <Link
                      to="/threads/$threadId"
                      params={{ threadId: post.id }}
                      className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-fill-secondary"
                    >
                      <span className="w-3 text-center font-rounded text-subhead font-semibold text-label-tertiary tabular">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-subhead font-medium text-label">{post.title}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-caption-1 text-label-tertiary">
                          <Favicon domain={post.domain} size={13} />
                          {post.domain}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
          </ol>
        </div>
      </div>

      <p className="relative mt-12 text-caption-1 text-label-tertiary">
        Open-source alternative to YC‑controlled HN · Powered by Appwrite
      </p>
    </aside>
  )
}

import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { completeAppwriteOAuth } from '@/lib/auth-client'
import { configQuery } from '@/lib/queries'
import { seo } from '@/lib/seo'
import { useSetSession } from '@/lib/session'
import { LogoMark } from '@/components/logo'
import { Spinner } from '@/components/ui/spinner'

/**
 * Appwrite returns here after "Continue with Appwrite" with a one-time
 * `userId` + `secret`. The browser turns them into an Appwrite session, then
 * hands the server a JWT for its own session cookie.
 */
export const Route = createFileRoute('/auth/callback')({
  validateSearch: z.object({
    userId: z.string().max(64).optional().catch(undefined),
    secret: z.string().max(1024).optional().catch(undefined),
    state: z.string().max(256).optional().catch(undefined),
  }),
  head: () => ({ meta: seo({ title: 'Signing in - Refetch', noindex: true }) }),
  component: OAuthCallback,
})

function OAuthCallback() {
  const search = Route.useSearch()
  const { data: config } = useSuspenseQuery(configQuery())
  const setSession = useSetSession()
  const navigate = useNavigate()
  const started = React.useRef(false)

  React.useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      const result = await completeAppwriteOAuth(config, search)
      if (!result.ok) {
        await navigate({
          to: '/signin',
          search: { oauth: 'failed', error: JSON.stringify({ message: result.error }) },
          replace: true,
        })
        return
      }
      await setSession(result.data.user)
      // New accounts pick a few channels and people before landing.
      if (result.data.isNew) {
        await navigate({ to: '/welcome', search: { redirect: result.redirect }, replace: true })
      } else {
        await navigate({ href: result.redirect, replace: true })
      }
    })()
  }, [config, search, navigate, setSession])

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <LogoMark className="size-10" />
        <p className="flex items-center gap-2 text-subhead text-label-secondary">
          <Spinner className="size-4" />
          Signing you in…
        </p>
      </div>
    </main>
  )
}

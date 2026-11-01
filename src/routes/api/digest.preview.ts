import { createFileRoute } from '@tanstack/react-router'

/** Your own digest as it would arrive now (`?frequency=daily|weekly`), opened from Settings. */
export const Route = createFileRoute('/api/digest/preview')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const [{ getSessionUser }, { renderDigestFor }, { getEmailSettings }] = await Promise.all([
          import('@/server/session.server'),
          import('@/server/digest.server'),
          import('@/server/email-settings.server'),
        ])
        const user = await getSessionUser()
        if (!user) return new Response('Sign in to preview your digest.', { status: 401 })
        const settings = await getEmailSettings(user.id)
        const asked = new URL(request.url).searchParams.get('frequency')
        const frequency =
          asked === 'daily' || asked === 'weekly' ? asked : settings.digest === 'daily' ? 'daily' : 'weekly'
        const email = await renderDigestFor(user.id, frequency, settings.timezone)
        const html =
          email?.html ??
          '<p style="font-family:sans-serif;padding:24px">Nothing to send right now. Check back later.</p>'
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'private, no-store',
            'X-Robots-Tag': 'noindex',
          },
        })
      },
    },
  },
})

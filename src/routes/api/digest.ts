import { timingSafeEqual } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'

/**
 * Sends the digests that are due. Called every hour by the Digest function
 * (functions/digest) with `Authorization: Bearer <DIGEST_SECRET>`; when the
 * response says `more`, it calls again.
 */
export const Route = createFileRoute('/api/digest')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ getDigestSecret }, { runDigests }] = await Promise.all([
          import('@/server/env.server'),
          import('@/server/digest.server'),
        ])
        const secret = getDigestSecret()
        if (!secret) return new Response('Not found', { status: 404 })
        const given = Buffer.from(request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '')
        const expected = Buffer.from(secret)
        if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
          return new Response('Unauthorized', { status: 401 })
        }
        try {
          return Response.json(await runDigests())
        } catch (error) {
          console.error('[digest] run failed', error)
          return Response.json(
            { error: error instanceof Error ? error.message : 'Digest run failed' },
            { status: 500 },
          )
        }
      },
    },
  },
})

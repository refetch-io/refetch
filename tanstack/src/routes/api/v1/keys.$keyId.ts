import { createFileRoute } from '@tanstack/react-router'
import { deleteApiKey } from '@/lib/api/keys.server'
import { handleRouteError, json, requireJwtUser } from '@/lib/api/http.server'

export const Route = createFileRoute('/api/v1/keys/$keyId')({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        try {
          const user = await requireJwtUser(request)
          await deleteApiKey(user.$id, params.keyId)
          return json({ ok: true })
        } catch (error) {
          return handleRouteError(error)
        }
      },
    },
  },
})

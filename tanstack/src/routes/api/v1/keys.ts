import { createFileRoute } from '@tanstack/react-router'
import {
  createApiKey,
  listApiKeys,
} from '@/lib/api/keys.server'
import { handleRouteError, json, requireJwtUser } from '@/lib/api/http.server'

export const Route = createFileRoute('/api/v1/keys')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const user = await requireJwtUser(request)
          const keys = await listApiKeys(user.$id)
          return json({ data: keys })
        } catch (error) {
          return handleRouteError(error)
        }
      },
      POST: async ({ request }) => {
        try {
          const user = await requireJwtUser(request)
          const body = await request.json().catch(() => ({}))
          const name =
            typeof body.name === 'string' ? body.name : 'API key'
          const key = await createApiKey(user.$id, user.name, name)
          return json(key, 201)
        } catch (error) {
          return handleRouteError(error)
        }
      },
    },
  },
})

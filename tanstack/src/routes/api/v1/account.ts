import { createFileRoute } from '@tanstack/react-router'
import { Account, Users } from 'node-appwrite'
import { createApiKeyClient, createJwtClient } from '@/lib/appwrite.server'
import {
  apiError,
  getBearerToken,
  handleRouteError,
  json,
  requireJwtUser,
  requireUser,
} from '@/lib/api/http.server'

export const Route = createFileRoute('/api/v1/account')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const user = await requireUser(request)
          return json({
            $id: user.$id,
            name: user.name,
            email: user.email,
          })
        } catch (error) {
          return handleRouteError(error)
        }
      },
      DELETE: async ({ request }) => {
        try {
          const user = await requireJwtUser(request)
          const users = new Users(createApiKeyClient())
          await users.delete({ userId: user.$id })
          return json({ ok: true })
        } catch (error) {
          return handleRouteError(error)
        }
      },
      PATCH: async ({ request }) => {
        try {
          const jwt = getBearerToken(request)
          if (!jwt) {
            return apiError(401, 'Missing or invalid authorization header')
          }

          // Account mutations require a session JWT (not an API key).
          await requireJwtUser(request)
          const body = await request.json()
          const jwtAccount = new Account(createJwtClient(jwt))

          if (typeof body.name === 'string' && body.name.trim()) {
            await jwtAccount.updateName({ name: body.name.trim() })
          }

          if (typeof body.email === 'string' && body.email.trim()) {
            if (!body.password) {
              return apiError(
                400,
                'Current password is required to update email',
              )
            }
            await jwtAccount.updateEmail({
              email: body.email.trim(),
              password: String(body.password),
            })
          }

          if (typeof body.newPassword === 'string' && body.newPassword) {
            if (!body.oldPassword) {
              return apiError(
                400,
                'Current password is required to update password',
              )
            }
            await jwtAccount.updatePassword({
              password: String(body.newPassword),
              oldPassword: String(body.oldPassword),
            })
          }

          const refreshed = await jwtAccount.get()
          return json({
            $id: refreshed.$id,
            name: refreshed.name,
            email: refreshed.email,
          })
        } catch (error) {
          return handleRouteError(error)
        }
      },
    },
  },
})

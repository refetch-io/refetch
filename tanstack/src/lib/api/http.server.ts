import type { Models } from 'node-appwrite'
import { getUserFromJwt } from '../appwrite.server'
import type { ApiErrorBody } from '../types'
import { AuthError } from './auth-error.server'
import { getUserFromApiKey, isApiKeyToken } from './keys.server'

export { AuthError }

export function json<T>(data: T, status = 200, headers?: HeadersInit) {
  return Response.json(data, { status, headers })
}

export function apiError(
  status: number,
  error: string,
  extras?: Omit<ApiErrorBody, 'error'>,
) {
  return json({ error, ...extras }, status)
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

export async function resolveUser(
  request: Request,
): Promise<Models.User<Models.Preferences>> {
  const token = getBearerToken(request)
  if (!token) {
    throw new AuthError('Missing or invalid authorization header', 401)
  }

  if (isApiKeyToken(token)) {
    try {
      return await getUserFromApiKey(token)
    } catch (error) {
      if (error instanceof AuthError) throw error
      throw new AuthError('Invalid API key', 401)
    }
  }

  try {
    return await getUserFromJwt(token)
  } catch {
    throw new AuthError('Invalid or expired token', 401)
  }
}

/** JWT session or personal API key (`rfk_…`). */
export async function requireUser(
  request: Request,
): Promise<Models.User<Models.Preferences>> {
  return resolveUser(request)
}

/** Appwrite session JWT only - for account mutations and key management. */
export async function requireJwtUser(
  request: Request,
): Promise<Models.User<Models.Preferences>> {
  const token = getBearerToken(request)
  if (!token) {
    throw new AuthError('Missing or invalid authorization header', 401)
  }
  if (isApiKeyToken(token)) {
    throw new AuthError(
      'This action requires a session JWT, not an API key',
      401,
    )
  }
  try {
    return await getUserFromJwt(token)
  } catch {
    throw new AuthError('Invalid or expired token', 401)
  }
}

export async function optionalUser(request: Request) {
  const token = getBearerToken(request)
  if (!token) return null
  try {
    return await resolveUser(request)
  } catch {
    return null
  }
}

export function handleRouteError(error: unknown) {
  if (error instanceof AuthError) {
    return apiError(error.status, error.message)
  }
  console.error(error)
  return apiError(
    500,
    error instanceof Error ? error.message : 'Internal server error',
  )
}

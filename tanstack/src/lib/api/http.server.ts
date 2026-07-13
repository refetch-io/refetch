import type { Models } from 'node-appwrite'
import { getUserFromJwt } from '../appwrite.server'
import type { ApiErrorBody } from '../types'

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

export async function requireUser(request: Request): Promise<Models.User<Models.Preferences>> {
  const jwt = getBearerToken(request)
  if (!jwt) {
    throw new AuthError('Missing or invalid authorization header', 401)
  }
  try {
    return await getUserFromJwt(jwt)
  } catch {
    throw new AuthError('Invalid or expired token', 401)
  }
}

export async function optionalUser(request: Request) {
  const jwt = getBearerToken(request)
  if (!jwt) return null
  try {
    return await getUserFromJwt(jwt)
  } catch {
    return null
  }
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status = 401) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

export function handleRouteError(error: unknown) {
  if (error instanceof AuthError) {
    return apiError(error.status, error.message)
  }
  console.error(error)
  return apiError(500, error instanceof Error ? error.message : 'Internal server error')
}

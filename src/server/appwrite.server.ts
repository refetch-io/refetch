import { Account, AppwriteException, Avatars, Client, TablesDB } from 'node-appwrite'
import { getRequestHeader } from '@tanstack/react-start/server'
import { getAppwriteConfig } from './env.server'

/**
 * Admin client — authenticated with the server API key. Used for database
 * access (the same model the previous Next.js API routes used) and for
 * creating sessions on behalf of users.
 */
export function createAdminClient() {
  const config = getAppwriteConfig()
  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey)

  // Sessions created through the admin client should show the visitor's
  // device in the Appwrite console, not the server's.
  const userAgent = getRequestHeader('user-agent')
  if (userAgent) client.setForwardedUserAgent(userAgent)

  return {
    account: new Account(client),
    tables: new TablesDB(client),
  }
}

/** Session client — acts as the signed-in user. */
export function createSessionClient(secret: string) {
  const config = getAppwriteConfig()
  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setSession(secret)

  const userAgent = getRequestHeader('user-agent')
  if (userAgent) client.setForwardedUserAgent(userAgent)

  return {
    account: new Account(client),
    avatars: new Avatars(client),
  }
}

export function isAppwriteError(error: unknown, ...types: Array<string>): error is AppwriteException {
  if (!(error instanceof AppwriteException)) return false
  return types.length === 0 || types.includes(error.type)
}

export function isNotFound(error: unknown) {
  return error instanceof AppwriteException && error.code === 404
}

/** Translate Appwrite auth errors into copy we can show to people. */
export function describeAuthError(error: unknown): string {
  if (!(error instanceof AppwriteException)) {
    return 'Something went wrong. Please try again.'
  }
  switch (error.type) {
    case 'user_invalid_credentials':
      return 'Incorrect email or password.'
    case 'user_already_exists':
    case 'user_email_already_exists':
      return 'An account with this email already exists. Try signing in instead.'
    case 'user_blocked':
      return 'This account has been blocked.'
    case 'general_rate_limit_exceeded':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'general_unauthorized_scope':
      return 'Sign-in is not configured yet: the server API key needs the "sessions.write" scope.'
    case 'project_provider_disabled':
      return 'Sign in with Appwrite is not enabled for this project yet.'
    case 'user_session_already_exists':
      return 'You are already signed in.'
    default:
      return error.message || 'Something went wrong. Please try again.'
  }
}

import { Account, AppwriteException, Client, TablesDB } from 'node-appwrite'
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

export function isAppwriteError(error: unknown, ...types: Array<string>): error is AppwriteException {
  if (!(error instanceof AppwriteException)) return false
  return types.length === 0 || types.includes(error.type)
}

export function isNotFound(error: unknown) {
  return error instanceof AppwriteException && error.code === 404
}

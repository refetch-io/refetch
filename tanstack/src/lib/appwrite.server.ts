import { Client, Account, TablesDB, ID, Query } from 'node-appwrite'
import { env } from './env'

export { ID, Query }

export function createApiKeyClient() {
  return new Client()
    .setEndpoint(env.appwriteEndpoint)
    .setProject(env.appwriteProjectId)
    .setKey(env.appwriteApiKey)
}

export function createJwtClient(jwt: string) {
  return new Client()
    .setEndpoint(env.appwriteEndpoint)
    .setProject(env.appwriteProjectId)
    .setJWT(jwt)
}

export function getTablesDB() {
  return new TablesDB(createApiKeyClient())
}

export async function getUserFromJwt(jwt: string) {
  const client = createJwtClient(jwt)
  const account = new Account(client)
  return account.get()
}

export const tables = {
  databaseId: () => env.databaseId,
  posts: () => env.postsTableId,
  votes: () => env.votesTableId,
  comments: () => env.commentsTableId,
  keys: () => env.keysTableId,
}

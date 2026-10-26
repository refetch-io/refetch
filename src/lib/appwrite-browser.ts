import type { Account, Avatars, OAuthProvider } from 'appwrite'

/*
 * The Appwrite web SDK, for things that must run as the signed-in person in
 * their browser: signing in (OAuth and email), changing their name and photo,
 * and signing out. Loaded on demand so it stays out of the initial bundle.
 */

export interface BrowserConfig {
  appwriteEndpoint: string
  appwriteProjectId: string
}

interface BrowserSdk {
  account: Account
  avatars: Avatars
  newId: () => string
  appwriteProvider: OAuthProvider
}

let sdk: Promise<BrowserSdk> | null = null

export function appwriteBrowser(config: BrowserConfig): Promise<BrowserSdk> {
  sdk ??= import('appwrite').then(({ Account, Avatars, Client, ID, OAuthProvider }) => {
    const client = new Client().setEndpoint(config.appwriteEndpoint).setProject(config.appwriteProjectId)
    return {
      account: new Account(client),
      avatars: new Avatars(client),
      newId: () => ID.unique(),
      appwriteProvider: OAuthProvider.Appwrite,
    }
  })
  return sdk
}

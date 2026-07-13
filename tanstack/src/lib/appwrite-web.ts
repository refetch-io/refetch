import {
  Account,
  Avatars,
  Client,
  ID,
  Permission,
  Presences,
  Role,
} from 'appwrite'
import { env } from './env'
import { getInitials } from './utils'

export const client = new Client()
  .setEndpoint(env.appwriteEndpoint)
  .setProject(env.appwriteProjectId)

export const account = new Account(client)
export const avatars = new Avatars(client)
export const presences = new Presences(client)
export { ID, Permission, Role }

export function getFaviconUrl(domain: string): string {
  try {
    const fullUrl = domain.startsWith('http') ? domain : `https://${domain}`
    return avatars.getFavicon(fullUrl)
  } catch {
    return ''
  }
}

/** Appwrite-generated initials avatar (always max 2 characters). */
export function getInitialsAvatarUrl(
  name: string,
  size = 128,
  background: '000000' | 'ffffff' = '000000',
): string {
  const initials = getInitials(name, 2)
  // Appwrite takes the first letter of each word — space letters to keep both.
  const avatarName =
    initials.length > 1 ? initials.split('').join(' ') : initials || 'U'

  return avatars.getInitials({
    name: avatarName,
    width: size,
    height: size,
    background,
  })
}

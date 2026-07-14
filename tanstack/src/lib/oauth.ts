import { OAuthProvider } from 'appwrite'
import { account } from '@/lib/appwrite-web'

/** Start OAuth with the Appwrite provider configured in Console. */
export function startAppwriteOAuth(mode: 'signin' | 'signup' = 'signin') {
  const origin = window.location.origin
  const failurePath = mode === 'signup' ? '/signup' : '/signin'

  account.createOAuth2Session({
    provider: OAuthProvider.Appwrite,
    success: `${origin}/`,
    failure: `${origin}${failurePath}?error=oauth`,
  })
}

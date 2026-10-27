import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { signOutEverywhere } from './auth-client'
import { configQuery, sessionQuery } from './queries'
import type { SessionUser } from './types'
import { clearVoteOverrides } from './vote-store'

/** Query keys whose data depends on who is signed in. */
const USER_SCOPED = new Set([
  'feed',
  'mine',
  'thread',
  'channels',
  'channel',
  'following',
  'profile',
  'people',
  'onboarding',
  'who-to-follow',
  'followed',
  'inbox',
  'unread',
  'conversation',
  'messages',
  'notifications',
  'notification-count',
  'saved',
  'saved-ids',
  'moderation',
])

export function useSession(): { user: SessionUser | null } {
  const { data } = useSuspenseQuery(sessionQuery())
  return { user: data }
}

/** Swap the signed-in identity everywhere (session cache, votes, router context). */
export function useSetSession() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return async (user: SessionUser | null) => {
    queryClient.setQueryData(sessionQuery().queryKey, user)
    clearVoteOverrides()
    queryClient.removeQueries({ predicate: (query) => USER_SCOPED.has(String(query.queryKey[0])) })
    await router.invalidate()
  }
}

export function useSignOut() {
  const { data: config } = useSuspenseQuery(configQuery())
  const setSession = useSetSession()
  const router = useRouter()
  return async () => {
    try {
      // Ends the Appwrite session in this browser and clears the server cookie.
      await signOutEverywhere(config)
    } finally {
      await setSession(null)
      toast.success('Signed out', { description: 'See you soon.' })
      const path = router.state.location.pathname
      if (path === '/mines' || path === '/submit') await router.navigate({ to: '/' })
    }
  }
}

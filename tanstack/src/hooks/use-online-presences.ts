import { useOnlinePresenceContext } from '@/contexts/online-presence-context'

/** Live presence list - Appwrite Realtime + OnlinePresenceProvider. */
export function useOnlinePresences() {
  return useOnlinePresenceContext()
}

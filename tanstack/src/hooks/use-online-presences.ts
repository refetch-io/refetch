import { useOnlinePresenceContext } from '@/contexts/online-presence-context'

/** Live presence list — backed by OnlinePresenceProvider in the app shell. */
export function useOnlinePresences() {
  return useOnlinePresenceContext()
}

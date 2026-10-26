import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useSession } from '@/lib/session'

/**
 * Guard for outbound story links. Members pass through; visitors go to sign
 * up (with the story shown above the form) and land on it afterwards.
 * Returns true when the click may proceed.
 */
export function useJoinGate() {
  const { user } = useSession()
  const navigate = useNavigate()
  return React.useCallback(
    (event: React.MouseEvent, story: { id: string }) => {
      if (user) return true
      event.preventDefault()
      void navigate({ to: '/signup', search: { story: story.id, redirect: `/threads/${story.id}` } })
      return false
    },
    [user, navigate],
  )
}

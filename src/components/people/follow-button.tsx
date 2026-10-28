import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Check, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { followUser } from '@/api/profiles'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'

/** Follow / unfollow with an optimistic label. Signed-out people go to sign-in. */
export function FollowButton({
  userId,
  name,
  following,
  size = 'sm',
  className,
}: {
  userId: string
  name: string
  following: boolean
  size?: 'xs' | 'sm' | 'md'
  className?: string
}) {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const follow = useServerFn(followUser)
  const [optimistic, setOptimistic] = React.useState<boolean | null>(null)
  const active = optimistic ?? following

  React.useEffect(() => setOptimistic(null), [following])

  const toggle = async () => {
    if (!user) {
      await navigate({ to: '/signin', search: { redirect: location.href } })
      return
    }
    const next = !active
    setOptimistic(next)
    try {
      const result = await follow({ data: { userId, follow: next } })
      if (!result.ok) throw new Error(result.error)
      if (next) toast.success(`Following ${name}`, { description: 'Their stories now show up in Following.' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
        // Your own Following count and list.
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['following'] }),
        queryClient.invalidateQueries({ queryKey: ['followed'] }),
      ])
    } catch (error) {
      setOptimistic(!next)
      toast.error(error instanceof Error ? error.message : 'Couldn’t update. Try again.')
    }
  }

  return (
    <Button
      variant={active ? 'secondary' : 'primary'}
      size={size}
      onClick={() => void toggle()}
      aria-pressed={active}
      className={cn('min-w-[6.5rem]', className)}
    >
      {active ? <Check /> : <UserPlus />}
      {active ? 'Following' : 'Follow'}
    </Button>
  )
}

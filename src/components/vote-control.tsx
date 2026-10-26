import * as React from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { vote as voteFn } from '@/api/content'
import { useSession } from '@/lib/session'
import type { ResourceType, VoteDirection, VoteState } from '@/lib/types'
import { cn } from '@/lib/utils'
import { nextVoteState, setVoteOverride, useVoteState } from '@/lib/vote-store'

interface VoteControlProps {
  type: ResourceType
  id: string
  initial: VoteState
  orientation?: 'vertical' | 'horizontal'
  size?: 'sm' | 'md' | 'lg'
  /** Local-only voting, for previews such as the design system page. */
  demo?: boolean
  className?: string
}

const SIZES = {
  sm: { button: 'size-[22px]', icon: 'size-3.5', count: 'text-caption-1 leading-4 min-w-5' },
  md: { button: 'size-7', icon: 'size-[18px]', count: 'text-footnote leading-5 min-w-6' },
  lg: { button: 'size-9', icon: 'size-5', count: 'text-callout leading-6 min-w-7' },
}

/**
 * Up/down voting with optimistic updates. Signed-out visitors are sent to
 * sign in and brought back afterwards.
 */
export function VoteControl({
  type,
  id,
  initial,
  orientation = 'vertical',
  size = 'md',
  demo = false,
  className,
}: VoteControlProps) {
  const state = useVoteState(type, id, initial)
  const { user } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const castVote = useServerFn(voteFn)
  const [pending, setPending] = React.useState(false)
  const [motion, setMotion] = React.useState<'up' | 'down' | null>(null)

  const onVote = async (direction: VoteDirection) => {
    if (demo) {
      const next = nextVoteState(state, direction)
      setMotion(next.count >= state.count ? 'up' : 'down')
      setVoteOverride(type, id, next)
      return
    }
    if (!user) {
      await navigate({ to: '/signin', search: { redirect: location.href } })
      return
    }
    if (pending) return

    const previous = state
    const optimistic = nextVoteState(previous, direction)
    setMotion(optimistic.count >= previous.count ? 'up' : 'down')
    setVoteOverride(type, id, optimistic)
    setPending(true)
    try {
      const result = await castVote({ data: { resourceType: type, resourceId: id, direction } })
      if (result.ok) {
        setVoteOverride(type, id, result.data)
      } else {
        setVoteOverride(type, id, previous)
        toast.error(result.error)
        if (result.code === 'unauthorized')
          await navigate({ to: '/signin', search: { redirect: location.href } })
      }
    } catch {
      setVoteOverride(type, id, previous)
      toast.error('Couldn’t save your vote', { description: 'Check your connection and try again.' })
    } finally {
      setPending(false)
    }
  }

  const s = SIZES[size]
  const noun = type === 'post' ? 'story' : 'comment'

  return (
    <div
      className={cn(
        'flex shrink-0 items-center',
        orientation === 'vertical' ? 'flex-col' : 'flex-row rounded-full bg-fill-secondary',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onVote('up')}
        aria-pressed={state.vote === 'up'}
        aria-label={state.vote === 'up' ? `Remove upvote from ${noun}` : `Upvote ${noun}`}
        className={cn(
          'relative grid pressable place-items-center rounded-full after:absolute after:-inset-1.5 after:content-[""]',
          s.button,
          state.vote === 'up' ? 'bg-up-tint text-up' : 'text-label-tertiary hover:bg-up-tint hover:text-up',
        )}
      >
        <ChevronUp className={s.icon} strokeWidth={2.6} />
      </button>
      <span
        aria-live="polite"
        aria-label={`${state.count} points`}
        className={cn(
          'relative overflow-hidden text-center font-rounded font-semibold tabular',
          s.count,
          state.vote === 'up' ? 'text-up' : state.vote === 'down' ? 'text-down' : 'text-label-secondary',
        )}
      >
        <span
          key={state.count}
          className={cn(
            'inline-block',
            motion === 'up' && 'animate-count-up',
            motion === 'down' && 'animate-count-down',
          )}
        >
          {state.count}
        </span>
      </span>
      <button
        type="button"
        onClick={() => onVote('down')}
        aria-pressed={state.vote === 'down'}
        aria-label={state.vote === 'down' ? `Remove downvote from ${noun}` : `Downvote ${noun}`}
        className={cn(
          'relative grid pressable place-items-center rounded-full after:absolute after:-inset-1.5 after:content-[""]',
          s.button,
          state.vote === 'down'
            ? 'bg-down-tint text-down'
            : 'text-label-tertiary hover:bg-down-tint hover:text-down',
        )}
      >
        <ChevronDown className={s.icon} strokeWidth={2.6} />
      </button>
    </div>
  )
}

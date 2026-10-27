import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Bookmark } from 'lucide-react'
import { toast } from 'sonner'
import { saveStory } from '@/api/saves'
import { savedIdsQuery } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Tooltip } from '../ui/tooltip'

/** Whether a story is saved, and a toggle with an optimistic update. */
export function useSavedStory(postId: string) {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const save = useServerFn(saveStory)
  const query = savedIdsQuery(user?.id ?? '')
  const { data } = useQuery({ ...query, enabled: Boolean(user) })
  const saved = Boolean(user && data?.includes(postId))

  const toggle = async () => {
    if (!user) {
      await navigate({ to: '/signin', search: { redirect: location.href } })
      return
    }
    const next = !saved
    const apply = (value: boolean) =>
      queryClient.setQueryData(query.queryKey, (ids = []) =>
        value ? [postId, ...ids.filter((id) => id !== postId)] : ids.filter((id) => id !== postId),
      )
    apply(next)
    try {
      const result = await save({ data: { postId, saved: next } })
      if (!result.ok) throw new Error(result.error)
      toast.success(next ? 'Saved for later' : 'Removed from saved')
      void queryClient.invalidateQueries({ queryKey: ['saved'] })
    } catch (error) {
      apply(!next)
      toast.error(error instanceof Error && error.message ? error.message : 'Couldn’t save that story.')
    }
  }

  return { saved, toggle }
}

/** Bookmark toggle: a quiet icon in feed rows, a labelled button on the story page. */
export function SaveButton({
  postId,
  variant = 'icon',
  quiet = false,
  className,
}: {
  postId: string
  variant?: 'icon' | 'button'
  /** Feed rows: show only on hover, focus or keyboard selection, unless saved. */
  quiet?: boolean
  className?: string
}) {
  const { saved, toggle } = useSavedStory(postId)
  const label = saved ? 'Remove from saved' : 'Save for later'
  const icon = <Bookmark className={cn(saved && 'fill-current')} />

  if (variant === 'button') {
    return (
      <Button
        variant={saved ? 'tinted' : 'secondary'}
        size="md"
        aria-pressed={saved}
        data-kb-action="save"
        onClick={() => void toggle()}
        className={className}
      >
        {icon}
        {saved ? 'Saved' : 'Save'}
      </Button>
    )
  }

  return (
    <Tooltip content={label}>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={label}
        aria-pressed={saved}
        data-kb-action="save"
        onClick={() => void toggle()}
        className={cn(
          saved && 'text-brand-text hover:text-brand-text',
          quiet &&
            !saved &&
            'opacity-0 group-hover/row:opacity-100 group-data-[kb-selected]/row:opacity-100 focus-visible:opacity-100',
          className,
        )}
      >
        {icon}
      </Button>
    </Tooltip>
  )
}

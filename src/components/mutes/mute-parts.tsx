import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Ellipsis, Eye, EyeOff, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { saveMute } from '@/api/mutes'
import { type Mute, type MuteKind, normalizeMute, sameMute } from '@/lib/mutes'
import { mutesQuery } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { topicDisplayLabel } from '@/lib/topics'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '../ui/menu'
import { Tooltip } from '../ui/tooltip'
import { useChannels } from '../channels/channel-parts'

/** The signed-in person's mutes, and a toggle with an optimistic update and Undo. */
export function useMutes() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const save = useServerFn(saveMute)
  const query = mutesQuery(user?.id ?? '')
  const { data: mutes = [] } = useQuery({ ...query, enabled: Boolean(user) })

  const isMuted = (kind: MuteKind, value: string) =>
    mutes.some((mute) => mute.kind === kind && mute.value === (normalizeMute(kind, value) ?? value))

  const apply = (muted: boolean, mute: Mute) =>
    queryClient.setQueryData(query.queryKey, (list = []) =>
      muted ? [mute, ...list.filter((m) => !sameMute(m, mute))] : list.filter((m) => !sameMute(m, mute)),
    )

  /** Mute or unmute; `label` is how the toast names it ("github.com", "Rust"). */
  const setMute = async (kind: MuteKind, value: string, label: string, muted: boolean): Promise<boolean> => {
    if (!user) {
      await navigate({ to: '/signin', search: { redirect: location.href } })
      return false
    }
    const optimistic = { kind, value: normalizeMute(kind, value) ?? value }
    apply(muted, optimistic)
    try {
      const result = await save({ data: { kind, value, muted } })
      if (!result.ok) throw new Error(result.error)
      apply(muted, result.data)
      toast.success(muted ? `Muted ${label}` : `Unmuted ${label}`, {
        description: muted ? 'Its stories are hidden from your feeds and digests.' : undefined,
        action: {
          label: 'Undo',
          onClick: () => void setMute(kind, result.data.value, label, !muted),
        },
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: ['following'] }),
      ])
      return true
    } catch (error) {
      apply(!muted, optimistic)
      toast.error(error instanceof Error && error.message ? error.message : 'Couldn’t save that. Try again.')
      return false
    }
  }

  return { mutes, isMuted, setMute }
}

/** Mute / Muted toggle for a channel, topic or site page. */
export function MuteButton({
  kind,
  value,
  label,
  size = 'sm',
  className,
}: {
  kind: MuteKind
  value: string
  label: string
  size?: 'xs' | 'sm' | 'md'
  className?: string
}) {
  const { isMuted, setMute } = useMutes()
  const [pending, setPending] = React.useState(false)
  const muted = isMuted(kind, value)

  return (
    <Tooltip
      content={muted ? `Show ${label} in your feeds again` : `Hide ${label} from your feeds and digests`}
    >
      <Button
        variant={muted ? 'tinted' : 'secondary'}
        size={size}
        aria-pressed={muted}
        disabled={pending}
        className={className}
        onClick={async () => {
          setPending(true)
          await setMute(kind, value, label, !muted)
          setPending(false)
        }}
      >
        <EyeOff />
        {muted ? 'Muted' : 'Mute'}
      </Button>
    </Tooltip>
  )
}

/**
 * "…" menu on a story: mute its site, its channel or (on the story page) its
 * topics. Feed rows show it on hover, like the save button.
 */
export function StoryMuteMenu({
  post,
  topics = [],
  quiet,
  size = 'icon-xs',
  className,
}: {
  post: { domain: string | null; channel: string | null }
  topics?: ReadonlyArray<string>
  quiet?: boolean
  size?: 'icon-xs' | 'icon'
  className?: string
}) {
  const { isMuted, setMute } = useMutes()
  const { byId } = useChannels()
  const channel = post.channel ? byId.get(post.channel) : undefined
  const items: Array<{ kind: MuteKind; value: string; label: string; text: string }> = []
  if (post.domain) items.push({ kind: 'domain', value: post.domain, label: post.domain, text: post.domain })
  if (channel) items.push({ kind: 'channel', value: channel.id, label: channel.name, text: channel.name })
  for (const topic of topics.slice(0, 4)) {
    const label = topicDisplayLabel(topic)
    items.push({ kind: 'topic', value: topic, label, text: `topic “${label}”` })
  }
  if (items.length === 0) return null

  return (
    <Menu>
      <Tooltip content="More">
        <MenuTrigger asChild>
          <Button
            variant="ghost"
            size={size}
            aria-label="More options"
            className={cn(
              quiet &&
                'opacity-0 group-hover/row:opacity-100 group-data-[kb-selected]/row:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100',
              className,
            )}
          >
            <Ellipsis />
          </Button>
        </MenuTrigger>
      </Tooltip>
      <MenuContent className="w-72">
        <MenuLabel className="text-caption-1 font-semibold text-label-tertiary">
          Hide from your feeds and digests
        </MenuLabel>
        {items.map((item) => {
          const muted = isMuted(item.kind, item.value)
          return (
            <MenuItem
              key={`${item.kind}:${item.value}`}
              onSelect={() => void setMute(item.kind, item.value, item.label, !muted)}
            >
              {muted ? <Eye /> : <EyeOff />}
              <span className="min-w-0 flex-1 truncate">
                {muted ? 'Unmute' : 'Mute'} {item.text}
              </span>
            </MenuItem>
          )
        })}
        <MenuSeparator />
        <MenuItem asChild>
          <Link to="/settings" hash="muted">
            <Settings2 />
            Manage muted
          </Link>
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

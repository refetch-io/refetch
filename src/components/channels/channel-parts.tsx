import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Check, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { setChannelMembership } from '@/api/channels'
import { channelDirectoryQuery } from '@/lib/queries'
import { useSession } from '@/lib/session'
import type { Channel, ChannelDirectory } from '@/lib/types'
import { cn, compactNumber } from '@/lib/utils'
import { Button } from '../ui/button'

/** Channel catalog + the viewer's memberships (prefetched by the app layout). */
export function useChannels() {
  const { user } = useSession()
  const { data } = useQuery(channelDirectoryQuery(user?.id ?? null))
  return React.useMemo(() => {
    const channels = data?.channels ?? []
    const joined = new Set(data?.joined ?? [])
    const byId = new Map(channels.map((channel) => [channel.id, channel]))
    return { channels, joined, byId, ready: Boolean(data) }
  }, [data])
}

/** Channels grouped by category, in catalog order. */
export function groupByCategory(channels: Array<Channel>) {
  const groups = new Map<string, Array<Channel>>()
  for (const channel of channels) {
    const group = groups.get(channel.category)
    if (group) group.push(channel)
    else groups.set(channel.category, [channel])
  }
  return [...groups].map(([category, items]) => ({ category, channels: items }))
}

/** Case-insensitive match on name, category, description and keywords. */
export function channelMatches(channel: Channel, query: string) {
  const term = query.trim().toLowerCase()
  if (!term) return true
  return [channel.name, channel.id, channel.category, channel.description, ...channel.keywords].some((text) =>
    text.toLowerCase().includes(term),
  )
}

/** Readable text color on top of a channel color. */
function inkFor(hex: string) {
  const value = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.62 ? '#1d1d1f' : '#ffffff'
}

export function ChannelIcon({
  channel,
  size = 32,
  className,
}: {
  channel: Channel
  size?: number
  className?: string
}) {
  const long = channel.glyph.length > 2
  return (
    <span
      aria-hidden
      className={cn(
        // Saturated brand colors glare on dark surfaces; soften them a touch.
        'inline-flex shrink-0 items-center justify-center overflow-hidden font-display font-semibold tracking-[-0.02em] select-none dark:opacity-80',
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: channel.color,
        color: inkFor(channel.color),
        fontSize: Math.round(size * (long ? 0.32 : 0.4)),
        boxShadow: 'inset 0 0 0 0.5px rgb(0 0 0 / 0.08)',
      }}
    >
      {channel.icon ? (
        <img
          src={channel.icon}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="size-full object-cover"
        />
      ) : (
        channel.glyph
      )}
    </span>
  )
}

/**
 * Quiet "Python" pill linking to the channel. Text only: it sits next to the
 * source favicon in meta rows, and two icons side by side read as noise.
 */
export function ChannelTag({ channelId, className }: { channelId: string | null; className?: string }) {
  const { byId } = useChannels()
  const channel = channelId ? byId.get(channelId) : undefined
  if (!channel) return null
  return (
    <Link
      to="/channels/$channelId"
      params={{ channelId: channel.id }}
      className={cn(
        '-my-0.5 inline-flex h-5 shrink-0 items-center rounded-full bg-fill px-2 text-caption-1 font-semibold text-label-secondary transition-colors hover:bg-brand-tint hover:text-brand-text',
        className,
      )}
    >
      {channel.name}
    </Link>
  )
}

export function memberLabel(count: number) {
  if (count <= 0) return 'No members yet'
  return `${compactNumber(count)} ${count === 1 ? 'member' : 'members'}`
}

/** Join / leave with an optimistic update of the directory cache. */
export function JoinButton({
  channel,
  size = 'sm',
  className,
}: {
  channel: Channel
  size?: 'xs' | 'sm' | 'md'
  className?: string
}) {
  const { user } = useSession()
  const { joined } = useChannels()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const setMembership = useServerFn(setChannelMembership)
  const [pending, setPending] = React.useState(false)
  const isMember = joined.has(channel.id)

  const update = (join: boolean) =>
    queryClient.setQueryData<ChannelDirectory>(channelDirectoryQuery(user?.id ?? null).queryKey, (current) =>
      current
        ? {
            joined: join
              ? [...new Set([...current.joined, channel.id])]
              : current.joined.filter((id) => id !== channel.id),
            channels: current.channels.map((c) =>
              c.id === channel.id ? { ...c, memberCount: Math.max(0, c.memberCount + (join ? 1 : -1)) } : c,
            ),
          }
        : current,
    )

  const onClick = async (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!user) {
      await navigate({ to: '/signin', search: { redirect: location.href } })
      return
    }
    if (pending) return
    const join = !isMember
    update(join)
    setPending(true)
    try {
      const result = await setMembership({ data: { id: channel.id, join } })
      if (!result.ok) {
        update(!join)
        toast.error(result.error)
        return
      }
      if (join)
        toast.success(`Joined ${channel.name}`, { description: 'Its stories now show up in Following.' })
      await queryClient.invalidateQueries({ queryKey: ['following'] })
    } catch {
      update(!join)
      toast.error('Couldn’t update your channels. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      variant={isMember ? 'secondary' : 'primary'}
      size={size}
      onClick={onClick}
      aria-pressed={isMember}
      aria-label={isMember ? `Leave ${channel.name}` : `Join ${channel.name}`}
      className={cn('min-w-[4.75rem]', className)}
    >
      {isMember ? <Check strokeWidth={2.6} /> : <Plus strokeWidth={2.6} />}
      {isMember ? 'Joined' : 'Join'}
    </Button>
  )
}

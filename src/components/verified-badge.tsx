import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { Verification, VerifiedKind } from '@/lib/types'
import { verifiedPeopleQuery } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { ChannelIcon, useChannels } from './channels/channel-parts'
import { Tooltip } from './ui/tooltip'

type BadgeKind = VerifiedKind | 'channel'

const BADGES: Record<BadgeKind, { label: string; color: string }> = {
  bot: { label: 'Official bot', color: 'text-verified-bot' },
  refetcher: { label: 'Verified refetcher', color: 'text-verified-refetcher' },
  channel: { label: 'Verified channel', color: 'text-verified-channel' },
}

/** Lucide's scalloped badge outline, filled in. */
const SEAL =
  'M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z'

/**
 * A seal with a check: grey for official bots, purple for verified refetchers,
 * gold for verified channels. `plain` drops the tooltip for badges inside links.
 */
export function VerifiedBadge({
  kind,
  size = 16,
  plain = false,
  className,
}: {
  kind: BadgeKind
  size?: number
  plain?: boolean
  className?: string
}) {
  const { label, color } = BADGES[kind]
  const badge = (
    <span
      role="img"
      aria-label={label}
      title={plain ? label : undefined}
      tabIndex={plain ? undefined : 0}
      className={cn('inline-flex shrink-0 rounded-full', !plain && 'cursor-help', color, className)}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <path d={SEAL} fill="currentColor" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
        <path
          d="m8.5 12 2.5 2.5 4.5-5"
          fill="none"
          stroke="#fff"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
  return plain ? badge : <Tooltip content={label}>{badge}</Tooltip>
}

/**
 * Someone's badge and, when they're affiliated with an organization, its
 * channel icon. Looked up from the verified list unless `verification` is given.
 */
export function PersonBadges({
  userId,
  verification,
  size = 16,
  plain = false,
}: {
  userId: string
  verification?: Verification | null
  size?: number
  /** Inside a link: no tooltip and no organization link. */
  plain?: boolean
}) {
  const { data } = useQuery({ ...verifiedPeopleQuery(), enabled: verification === undefined })
  const badge = verification !== undefined ? verification : (data?.[userId] ?? null)
  if (!badge) return null
  return (
    <>
      <VerifiedBadge kind={badge.kind} size={size} plain={plain} />
      {!plain && badge.org && <OrgBadge channelId={badge.org} size={size} />}
    </>
  )
}

function OrgBadge({ channelId, size }: { channelId: string; size: number }) {
  const { byId } = useChannels()
  const channel = byId.get(channelId)
  if (!channel) return null
  const label = `Affiliated with ${channel.name}`
  return (
    <Tooltip content={label}>
      <Link
        to="/channels/$channelId"
        params={{ channelId: channel.id }}
        aria-label={label}
        className="inline-flex shrink-0 transition-opacity hover:opacity-80"
      >
        <ChannelIcon channel={channel} size={size} />
      </Link>
    </Tooltip>
  )
}

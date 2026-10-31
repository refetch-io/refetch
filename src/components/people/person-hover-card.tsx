import * as React from 'react'
import { HoverCard as HoverCardPrimitive } from 'radix-ui'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { profileQuery } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { cn, compactNumber, isBotUser } from '@/lib/utils'
import { Avatar } from '../ui/avatar'
import { Skeleton } from '../ui/misc'
import { PersonBadges } from '../verified-badge'
import { FollowButton } from './follow-button'

/**
 * A brief of someone's profile when hovering their name. The profile loads on
 * first open and shares the profile page's cache. Touch screens skip it: a tap
 * follows the link.
 */
export function PersonHoverCard({
  userId,
  name,
  children,
}: {
  userId: string
  name: string
  children: React.ReactElement
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <HoverCardPrimitive.Root open={open} onOpenChange={setOpen} openDelay={450} closeDelay={150}>
      <HoverCardPrimitive.Trigger asChild>{children}</HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            'z-50 w-72 origin-(--radix-hover-card-content-transform-origin) animate-scale-in rounded-[18px] p-4',
            'glass-strong shadow-popover',
          )}
        >
          {open && <PersonBrief userId={userId} name={name} />}
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  )
}

function PersonBrief({ userId, name }: { userId: string; name: string }) {
  const { user } = useSession()
  const { data: profile, isPending } = useQuery(profileQuery(userId, user?.id ?? null))
  const displayName = profile?.name ?? name
  const showFollow = !isBotUser(userId) && userId !== user?.id

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <Link to="/users/$userId" params={{ userId }} aria-label={displayName}>
          <Avatar name={displayName} userId={userId} size={48} />
        </Link>
        {showFollow && profile && (
          <FollowButton
            userId={userId}
            name={displayName}
            following={profile.viewer?.following ?? false}
            size="sm"
          />
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Link
            to="/users/$userId"
            params={{ userId }}
            className="truncate text-headline text-label hover:text-brand-text"
          >
            {displayName}
          </Link>
          {profile && <PersonBadges userId={userId} verification={profile.verified} size={16} />}
        </div>
        {isPending ? (
          <div className="mt-2 space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ) : (
          profile?.bio && (
            <p className="mt-1 line-clamp-3 text-footnote text-pretty whitespace-pre-line text-label-secondary">
              {profile.bio}
            </p>
          )
        )}
      </div>

      {profile && (
        <div className="flex gap-4 text-footnote text-label-tertiary">
          <Stat value={profile.stats.karma} label="karma" />
          <Stat
            value={profile.stats.followers}
            label={profile.stats.followers === 1 ? 'follower' : 'followers'}
          />
          <Stat value={profile.stats.stories} label={profile.stats.stories === 1 ? 'story' : 'stories'} />
        </div>
      )}
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <span className="font-semibold text-label tabular">{compactNumber(value)}</span> {label}
    </span>
  )
}

import * as React from 'react'
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, linkOptions, useNavigate, useParams, useRouteContext } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Ban, CalendarDays, Ellipsis, Info, Link2, MessageCircle, PenLine, Users } from 'lucide-react'
import { toast } from 'sonner'
import { createConversation } from '@/api/messages'
import { setUserBlocked } from '@/api/profiles'
import { followedIdsQuery, profileInsightsQuery, profileQuery } from '@/lib/queries'
import { SITE_URL, breadcrumbs, profilePage, seo } from '@/lib/seo'
import { useSession } from '@/lib/session'
import type { PeoplePage, Profile, ProfileInsights } from '@/lib/types'
import { compactNumber, pluralize } from '@/lib/utils'
import { BotBadge } from '@/components/bot-badge'
import { PersonBadges } from '@/components/verified-badge'
import { ChannelIcon, useChannels } from '@/components/channels/channel-parts'
import { SponsorCard } from '@/components/insights/insights-rail'
import { ColumnTabs } from '@/components/feed/feed-column'
import { FeedColumnSection, FeedLayout } from '@/components/feed/feed-layout'
import { FeedSkeleton } from '@/components/feed/feed-view'
import { EditProfileDialog } from '@/components/people/edit-profile-dialog'
import { FollowButton } from '@/components/people/follow-button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, List, ListItem, SectionLabel } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'

/*
 * Every profile page (stories, comments, followers, following) shares one
 * shell: the layout route renders the profile card and rail (ProfileFrame),
 * and each tab renders its column with the sticky tabs (ProfileColumn).
 */

export type ProfileTab = 'stories' | 'comments' | 'followers' | 'following'

/** Inside the column the column is the card; lists render flat. */
export const COLUMN_LIST = 'rounded-none bg-transparent shadow-none'

export function firstName(profile: Pick<Profile, 'name'>) {
  return profile.name.split(' ')[0]
}

/** What a profile tab's loader hands to `profileHead`. */
export function profileHeadData(profile: Profile) {
  const { id, name, bio, website, joinedAt, isBot, verified, stats } = profile
  return { id, name, bio, website, joinedAt, isBot, verified, stats }
}

/**
 * Head tags for a profile page. Follower lists are thin, and so are profiles
 * (or comment tabs) with nothing on them yet, so those stay out of search.
 */
export function profileHead(
  loaderData: ReturnType<typeof profileHeadData> | undefined,
  userId: string,
  tab: ProfileTab,
) {
  const name = loaderData?.name ?? 'this person'
  const path = tab === 'stories' ? '' : `/${tab}`
  const url = `${SITE_URL}/users/${userId}${path}`
  const titles: Record<ProfileTab, string> = {
    stories: loaderData ? `${name} - Refetch` : 'Profile - Refetch',
    comments: `Comments by ${name} - Refetch`,
    followers: `People following ${name} - Refetch`,
    following: `People ${name} follows - Refetch`,
  }
  const stats = loaderData?.stats
  const empty = !stats || (tab === 'comments' ? stats.comments === 0 : stats.stories + stats.comments === 0)
  const meta = seo({
    title: titles[tab],
    description: loaderData?.bio || `Stories and comments by ${name} on Refetch.`,
    url,
    type: 'profile',
    noindex: tab === 'followers' || tab === 'following' || empty,
  })
  if (!loaderData) return { meta }
  return {
    meta,
    links: [{ rel: 'canonical', href: url }],
    scripts: [
      profilePage({ siteUrl: SITE_URL, url, person: loaderData }),
      breadcrumbs([
        { name: 'Refetch', url: `${SITE_URL}/` },
        { name, url: `${SITE_URL}/users/${userId}` },
        ...(tab === 'stories' ? [] : [{ name: titles[tab].replace(/ - Refetch$/, ''), url }]),
      ]),
    ],
  }
}

/** The card and rail around every tab. Rendered by the layout route, so it stays put while tabs change. */
export function ProfileFrame({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return (
    <FeedLayout
      header={<ProfileHeader profile={profile} />}
      railLabel={`About ${profile.name}`}
      rail={<ProfileRail profile={profile} />}
    >
      {children}
    </FeedLayout>
  )
}

/** A tab's column: the sticky tabs, the tab's list, and its pagination below the card. */
export function ProfileColumn({
  profile,
  tab,
  feed,
  children,
}: {
  profile: Profile
  tab: ProfileTab
  feed?: { posts: ReadonlyArray<unknown>; page: number; hasMore: boolean } | null
  children: React.ReactNode
}) {
  return (
    <FeedColumnSection column={<ProfileTabs profile={profile} tab={tab} />} feed={feed}>
      {children}
    </FeedColumnSection>
  )
}

function ProfileTabs({ profile, tab }: { profile: Profile; tab: ProfileTab }) {
  const params = { userId: profile.id }
  return (
    <ColumnTabs
      label={`${profile.name}’s profile`}
      tabs={[
        {
          key: 'stories',
          label: 'Stories',
          count: compactNumber(profile.stats.stories),
          active: tab === 'stories',
          link: linkOptions({ to: '/users/$userId', params }),
        },
        {
          key: 'comments',
          label: 'Comments',
          count: compactNumber(profile.stats.comments),
          active: tab === 'comments',
          link: linkOptions({ to: '/users/$userId/comments', params }),
        },
        {
          key: 'followers',
          label: 'Followers',
          count: compactNumber(profile.stats.followers),
          active: tab === 'followers',
          link: linkOptions({ to: '/users/$userId/followers', params }),
        },
        {
          key: 'following',
          label: 'Following',
          count: compactNumber(profile.stats.following),
          active: tab === 'following',
          link: linkOptions({ to: '/users/$userId/following', params }),
        },
      ]}
    />
  )
}

/** Pending state for a tab: the card and rail stay put, the tabs move, and only the list waits. */
export function profilePending(tab: ProfileTab) {
  return function ProfilePending() {
    const { userId } = useParams({ from: '/_app/users/$userId' })
    const { user } = useRouteContext({ from: '/_app/users/$userId' })
    const { data: profile } = useSuspenseQuery(profileQuery(userId, user?.id ?? null))
    return (
      <ProfileColumn profile={profile} tab={tab}>
        {tab === 'followers' || tab === 'following' ? <PeopleSkeleton /> : <FeedSkeleton rows={8} />}
      </ProfileColumn>
    )
  }
}

/* ──────────────────────────────── Header ──────────────────────────────── */

function ProfileHeader({ profile }: { profile: Profile }) {
  const [editing, setEditing] = React.useState(false)
  const [confirmBlock, setConfirmBlock] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const start = useServerFn(createConversation)
  const block = useServerFn(setUserBlocked)
  const viewer = profile.viewer

  const message = async () => {
    setBusy(true)
    try {
      const result = await start({ data: { userIds: [profile.id] } })
      if (!result.ok) throw new Error(result.error)
      await navigate({ to: '/messages/$conversationId', params: { conversationId: result.data.id } })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t open the conversation.')
    } finally {
      setBusy(false)
    }
  }

  const toggleBlock = async () => {
    const next = !viewer?.blocked
    setBusy(true)
    try {
      const result = await block({ data: { userId: profile.id, blocked: next } })
      if (!result.ok) throw new Error(result.error)
      toast.success(next ? `Blocked ${profile.name}` : `Unblocked ${profile.name}`, {
        description: next ? 'They can’t message you, and you won’t get their messages.' : undefined,
      })
      setConfirmBlock(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile', profile.id] }),
        queryClient.invalidateQueries({ queryKey: ['conversation'] }),
      ])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t update. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mb-5 animate-rise-in p-5 sm:mb-6 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar name={profile.name} userId={profile.id} size={88} className="shadow-card" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-title-1 text-label">{profile.name}</h1>
            <PersonBadges userId={profile.id} verification={profile.verified} size={22} />
            {profile.isBot && <BotBadge />}
            {viewer?.blocked && <Badge variant="danger">Blocked</Badge>}
          </div>
          {profile.bio && (
            <p className="mt-1.5 max-w-xl text-subhead text-pretty whitespace-pre-line text-label-secondary">
              {profile.bio}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-footnote text-label-tertiary">
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                className="inline-flex min-w-0 items-center gap-1.5 font-medium text-brand-text hover:underline"
              >
                <Link2 className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">
                  {profile.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </span>
              </a>
            )}
            {profile.joinedAt && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden />
                Joined{' '}
                {new Date(profile.joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>
          <div className="mt-4 flex gap-6">
            <KarmaStat profile={profile} />
            <Link
              to="/users/$userId/followers"
              params={{ userId: profile.id }}
              className="group flex flex-col"
            >
              <StatValue value={profile.stats.followers} />
              <StatLabel>{profile.stats.followers === 1 ? 'Follower' : 'Followers'}</StatLabel>
            </Link>
            <Link
              to="/users/$userId/following"
              params={{ userId: profile.id }}
              className="group flex flex-col"
            >
              <StatValue value={profile.stats.following} />
              <StatLabel>Following</StatLabel>
            </Link>
          </div>
        </div>

        {viewer?.isSelf ? (
          <Button variant="secondary" size="md" onClick={() => setEditing(true)} className="shrink-0">
            <PenLine />
            Edit profile
          </Button>
        ) : (
          !profile.isBot && (
            <div className="flex shrink-0 items-center gap-2">
              <FollowButton
                userId={profile.id}
                name={profile.name}
                following={viewer?.following ?? false}
                size="md"
              />
              {viewer?.canMessage && (
                <Button variant="secondary" size="md" loading={busy} onClick={() => void message()}>
                  <MessageCircle />
                  Message
                </Button>
              )}
              {viewer && (
                <Menu>
                  <MenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="More options">
                      <Ellipsis />
                    </Button>
                  </MenuTrigger>
                  <MenuContent align="end" className="w-52">
                    <MenuItem destructive={!viewer.blocked} onSelect={() => setConfirmBlock(true)}>
                      <Ban className="!text-current" />
                      {viewer.blocked ? 'Unblock' : 'Block'} {firstName(profile)}
                    </MenuItem>
                  </MenuContent>
                </Menu>
              )}
            </div>
          )
        )}
      </div>

      {viewer?.isSelf && <EditProfileDialog profile={profile} open={editing} onOpenChange={setEditing} />}
      <ConfirmDialog
        open={confirmBlock}
        onOpenChange={setConfirmBlock}
        title={viewer?.blocked ? `Unblock ${profile.name}?` : `Block ${profile.name}?`}
        description={
          viewer?.blocked
            ? 'They’ll be able to message you again.'
            : 'They won’t be able to message you or add you to groups. They aren’t told.'
        }
        confirmLabel={viewer?.blocked ? 'Unblock' : 'Block'}
        destructive={!viewer?.blocked}
        loading={busy}
        onConfirm={() => void toggleBlock()}
      />
    </Card>
  )
}

function StatValue({ value }: { value: number }) {
  return (
    <span className="font-rounded text-headline text-label tabular group-hover:text-brand-text">
      {compactNumber(value)}
    </span>
  )
}

function StatLabel({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 text-caption-1 text-label-tertiary">{children}</span>
}

/** Karma with how it's counted. Opens on hover and focus, and on tap where there's no hover. */
function KarmaStat({ profile }: { profile: Profile }) {
  const [open, setOpen] = React.useState(false)
  const whose = profile.viewer?.isSelf ? 'your' : `${firstName(profile)}’s`
  const explanation = (
    <>
      <span className="block font-semibold">Karma</span>
      <span className="mt-0.5 block text-label-secondary">
        The net score of {whose} stories: every upvote adds a point and every downvote takes one away. Votes
        on comments don’t count.
      </span>
    </>
  )
  return (
    <Tooltip content={explanation} side="bottom" open={open} onOpenChange={setOpen} className="max-w-64">
      <button
        type="button"
        className="group flex flex-col text-left"
        onClick={(event) => {
          // Radix closes tooltips on click; toggle instead so taps work on touch screens.
          event.preventDefault()
          setOpen((value) => !value)
        }}
      >
        <StatValue value={profile.stats.karma} />
        <StatLabel>
          Karma
          <Info className="size-3" aria-hidden />
        </StatLabel>
      </button>
    </Tooltip>
  )
}

/* ──────────────────────────────── People lists ──────────────────────────────── */

/** Followers or following: name, bio and a Follow button for everyone but you. */
export function PeopleList({
  data,
  empty,
}: {
  data: PeoplePage
  empty: { title: string; description: string; action?: React.ReactNode }
}) {
  const { user } = useSession()
  const { data: followed } = useQuery({ ...followedIdsQuery(user?.id ?? ''), enabled: Boolean(user) })
  if (data.people.length === 0) return <EmptyState icon={<Users />} {...empty} />
  const following = new Set(followed ?? [])

  return (
    <List className={COLUMN_LIST} style={{ '--list-inset': '0px' } as React.CSSProperties}>
      {data.people.map((person) => (
        <ListItem key={person.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <Link
            to="/users/$userId"
            params={{ userId: person.id }}
            className="group flex min-w-0 flex-1 items-center gap-3"
          >
            <Avatar name={person.name} userId={person.id} size={44} />
            <span className="min-w-0">
              <span className="block truncate text-subhead font-semibold text-label group-hover:text-brand-text">
                {person.name}
              </span>
              {person.bio && (
                <span className="line-clamp-2 text-footnote text-pretty text-label-secondary">
                  {person.bio}
                </span>
              )}
            </span>
          </Link>
          {person.id !== user?.id && (
            <FollowButton
              userId={person.id}
              name={person.name}
              following={following.has(person.id)}
              size="sm"
              className="shrink-0"
            />
          )}
        </ListItem>
      ))}
    </List>
  )
}

export function PeopleSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <List
      className={COLUMN_LIST}
      aria-busy="true"
      aria-label="Loading people"
      style={{ '--list-inset': '0px' } as React.CSSProperties}
    >
      {Array.from({ length: rows }, (_, i) => (
        <ListItem key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 rounded-full" style={{ width: `${30 + ((i * 17) % 30)}%` }} />
            <Skeleton className="h-3 w-3/5 rounded-full" />
          </div>
          <Skeleton className="h-8 w-[6.5rem] shrink-0 rounded-full" />
        </ListItem>
      ))}
    </List>
  )
}

/* ──────────────────────────────── Rail ──────────────────────────────── */

function ProfileRail({ profile }: { profile: Profile }) {
  const { data: insights } = useQuery(profileInsightsQuery(profile.id))

  if (!insights) {
    return (
      <>
        <Card className="h-[188px] animate-pulse" />
        <Card className="h-[160px] animate-pulse" />
        <SponsorCard />
      </>
    )
  }

  return (
    <>
      <ActivityCard activity={insights.activity} />
      {insights.channels.length > 0 && <PostsInCard channels={insights.channels} />}
      {insights.topStories.length > 0 && <TopStoriesCard stories={insights.topStories} />}
      {insights.following.length > 0 && (
        <FollowingCard profile={profile} people={insights.following} total={insights.followingTotal} />
      )}
      <SponsorCard />
    </>
  )
}

function ActivityCard({ activity }: { activity: ProfileInsights['activity'] }) {
  const stories = activity.reduce((sum, month) => sum + month.stories, 0)
  const comments = activity.reduce((sum, month) => sum + month.comments, 0)
  const max = Math.max(1, ...activity.map((month) => month.stories + month.comments))
  const monthLabel = (month: string) =>
    new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <SectionLabel className="px-0">Activity</SectionLabel>
        <span className="text-caption-1 text-label-tertiary">Last 12 months</span>
      </div>
      <p className="mt-2 text-subhead text-label tabular">
        <span className="font-semibold">{pluralize(stories, 'story', 'stories')}</span>
        <span className="text-label-tertiary"> · </span>
        <span className="font-semibold">{pluralize(comments, 'comment')}</span>
      </p>
      <ol aria-label="Monthly activity" className="mt-3 flex h-16 items-end gap-1">
        {activity.map((month) => {
          const total = month.stories + month.comments
          const label = `${monthLabel(month.month)}: ${pluralize(month.stories, 'story', 'stories')}, ${pluralize(month.comments, 'comment')}`
          return (
            <li
              key={month.month}
              title={label}
              aria-label={label}
              className="flex h-full flex-1 flex-col justify-end"
            >
              {total === 0 ? (
                <span className="h-[3px] rounded-full bg-fill" />
              ) : (
                <span
                  className="flex flex-col overflow-hidden rounded-[4px]"
                  style={{ height: `${Math.max(8, (total / max) * 100)}%` }}
                >
                  <span className="bg-brand/35" style={{ flexGrow: month.comments }} />
                  <span className="bg-brand" style={{ flexGrow: month.stories }} />
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <div className="mt-3 flex items-center gap-4 text-caption-1 text-label-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-brand" />
          Stories
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-brand/35" />
          Comments
        </span>
      </div>
    </Card>
  )
}

function PostsInCard({ channels }: { channels: ProfileInsights['channels'] }) {
  const { byId } = useChannels()
  const rows = channels.flatMap((item) => {
    const channel = byId.get(item.id)
    return channel ? [{ channel, stories: item.stories }] : []
  })
  if (rows.length === 0) return null
  return (
    <Card className="py-3">
      <SectionLabel className="px-4 pb-1">Posts in</SectionLabel>
      <ul role="list">
        {rows.map(({ channel, stories }) => (
          <li key={channel.id}>
            <Link
              to="/channels/$channelId"
              params={{ channelId: channel.id }}
              className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-fill-secondary"
            >
              <ChannelIcon channel={channel} size={26} />
              <span className="min-w-0 flex-1 truncate text-subhead font-medium text-label group-hover:text-brand-text">
                {channel.name}
              </span>
              <span className="text-caption-1 text-label-tertiary tabular">
                {pluralize(stories, 'story', 'stories')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function TopStoriesCard({ stories }: { stories: ProfileInsights['topStories'] }) {
  return (
    <Card className="py-3">
      <SectionLabel className="px-4 pb-1">Top stories</SectionLabel>
      <ol>
        {stories.map((story, index) => (
          <li key={story.id}>
            <Link
              to="/threads/$threadId"
              params={{ threadId: story.id }}
              className="group flex gap-3 px-4 py-2 transition-colors hover:bg-fill-secondary"
            >
              <span className="w-4 shrink-0 pt-px text-right font-rounded text-footnote font-semibold text-brand-text tabular">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-subhead font-medium text-label group-hover:text-brand-text">
                  {story.title}
                </span>
                <span className="mt-0.5 block text-caption-1 text-label-tertiary tabular">
                  ▲ {compactNumber(story.count)} · {pluralize(story.countComments, 'comment')}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function FollowingCard({
  profile,
  people,
  total,
}: {
  profile: Profile
  people: ProfileInsights['following']
  total: number
}) {
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <SectionLabel className="px-0">
          {profile.viewer?.isSelf ? 'You follow' : `${firstName(profile)} follows`}
        </SectionLabel>
        <Link
          to="/users/$userId/following"
          params={{ userId: profile.id }}
          className="text-caption-1 font-semibold text-brand-text hover:underline"
        >
          See all {compactNumber(total)}
        </Link>
      </div>
      <ul role="list" className="mt-3 grid grid-cols-4 gap-x-2 gap-y-3">
        {people.map((person) => (
          <li key={person.id}>
            <Link
              to="/users/$userId"
              params={{ userId: person.id }}
              className="group flex flex-col items-center gap-1.5 text-center"
            >
              <Avatar name={person.name} userId={person.id} size={44} />
              <span className="line-clamp-1 w-full text-caption-2 text-label-secondary group-hover:text-brand-text">
                {person.name.split(' ')[0]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

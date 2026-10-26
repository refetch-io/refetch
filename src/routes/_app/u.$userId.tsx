import * as React from 'react'
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Ban, CalendarDays, Ellipsis, Link2, MessageCircle, PenLine, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { createConversation } from '@/api/messages'
import { setUserBlocked } from '@/api/profiles'
import { FEED_MAX_PAGES } from '@/lib/constants'
import { profileInsightsQuery, profileQuery, userCommentsQuery, userStoriesQuery } from '@/lib/queries'
import { SITE_URL, seo } from '@/lib/seo'
import type { Profile, ProfileInsights } from '@/lib/types'
import { compactNumber, pluralize, timeAgo } from '@/lib/utils'
import { BotBadge } from '@/components/bot-badge'
import { ChannelIcon, useChannels } from '@/components/channels/channel-parts'
import { SponsorCard } from '@/components/insights/insights-rail'
import { FeedLayout } from '@/components/feed/feed-layout'
import { FeedList, FeedPagination, FeedSkeleton } from '@/components/feed/feed-view'
import { EditProfileDialog } from '@/components/people/edit-profile-dialog'
import { FollowButton } from '@/components/people/follow-button'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, List, SectionLabel } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu'
import { EmptyState } from '@/components/ui/misc'
import { SegmentedControl } from '@/components/ui/segmented-control'

type Tab = 'stories' | 'comments'

export const Route = createFileRoute('/_app/u/$userId')({
  validateSearch: z.object({
    tab: z.enum(['stories', 'comments']).optional().catch(undefined),
    page: z.number().int().min(2).max(FEED_MAX_PAGES).optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => ({ tab: (search.tab ?? 'stories') as Tab, page: search.page ?? 1 }),
  loader: async ({ context, params, deps }) => {
    const viewerId = context.user?.id ?? null
    // Sidebar insights load alongside but never hold the page.
    void context.queryClient.prefetchQuery(profileInsightsQuery(params.userId))
    const [profile] = await Promise.all([
      context.queryClient.ensureQueryData(profileQuery(params.userId, viewerId)),
      deps.tab === 'stories'
        ? context.queryClient.ensureQueryData(userStoriesQuery(params.userId, deps.page, viewerId))
        : context.queryClient.ensureQueryData(userCommentsQuery(params.userId, deps.page)),
    ])
    return { name: profile.name, bio: profile.bio }
  },
  head: ({ loaderData, params }) => ({
    meta: seo({
      title: loaderData ? `${loaderData.name} - Refetch` : 'Profile - Refetch',
      description:
        loaderData?.bio || `Stories and comments by ${loaderData?.name ?? 'this person'} on Refetch.`,
      url: `${SITE_URL}/u/${params.userId}`,
      type: 'website',
    }),
  }),
  pendingComponent: () => (
    <FeedLayout header={<div className="mb-6 h-56 animate-pulse rounded-card bg-surface shadow-card" />}>
      <FeedSkeleton />
    </FeedLayout>
  ),
  notFoundComponent: () => (
    <Card className="mx-auto max-w-xl">
      <EmptyState
        icon={<UserRound />}
        title="Nobody here"
        description="This profile doesn’t exist, or this person hasn’t posted yet."
        action={
          <Button asChild variant="primary" size="md">
            <Link to="/">Back to top stories</Link>
          </Button>
        }
      />
    </Card>
  ),
  component: ProfilePage,
})

function ProfilePage() {
  const { userId } = Route.useParams()
  const { tab, page } = Route.useLoaderDeps()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate({ from: Route.fullPath })
  const viewerId = user?.id ?? null
  const { data: profile } = useSuspenseQuery(profileQuery(userId, viewerId))

  return (
    <FeedLayout
      header={<ProfileHeader profile={profile} />}
      railLabel={`About ${profile.name}`}
      rail={<ProfileRail profile={profile} />}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <SegmentedControl<Tab>
          aria-label="Show"
          size="sm"
          className="w-56"
          value={tab}
          onValueChange={(value) =>
            navigate({
              search: { tab: value === 'stories' ? undefined : value, page: undefined },
              resetScroll: false,
            })
          }
          options={[
            { value: 'stories', label: `Stories ${compactNumber(profile.stats.stories)}` },
            { value: 'comments', label: `Comments ${compactNumber(profile.stats.comments)}` },
          ]}
        />
      </div>
      {tab === 'stories' ? (
        <UserStories userId={userId} page={page} viewerId={viewerId} name={profile.name} />
      ) : (
        <UserComments userId={userId} page={page} name={profile.name} />
      )}
    </FeedLayout>
  )
}

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

  const stats = [
    { label: 'Karma', value: profile.stats.karma },
    { label: 'Followers', value: profile.stats.followers },
    { label: 'Following', value: profile.stats.following },
  ]

  return (
    <Card className="mb-5 animate-rise-in p-5 sm:mb-6 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar name={profile.name} userId={profile.id} size={88} className="shadow-card" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-title-1 text-label">{profile.name}</h1>
            {profile.isBot && <BotBadge />}
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
          <dl className="mt-4 flex gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse">
                <dt className="text-caption-1 text-label-tertiary">{stat.label}</dt>
                <dd className="font-rounded text-headline text-label tabular">{compactNumber(stat.value)}</dd>
              </div>
            ))}
          </dl>
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
                      {viewer.blocked ? 'Unblock' : 'Block'} {profile.name.split(' ')[0]}
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

function UserStories({
  userId,
  page,
  viewerId,
  name,
}: {
  userId: string
  page: number
  viewerId: string | null
  name: string
}) {
  const { data } = useSuspenseQuery(userStoriesQuery(userId, page, viewerId))
  return (
    <FeedList
      page={data}
      empty={{ title: 'No stories yet', description: `${name} hasn’t shared a story yet.` }}
    />
  )
}

function UserComments({ userId, page, name }: { userId: string; page: number; name: string }) {
  const { data } = useQuery(userCommentsQuery(userId, page))
  if (!data) return <FeedSkeleton rows={5} />
  if (data.comments.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<MessageCircle />}
          title="No comments yet"
          description={`${name} hasn’t commented yet.`}
        />
      </Card>
    )
  }
  return (
    <>
      <List>
        {data.comments.map((comment) => (
          <li key={comment.id} className="px-4 py-3.5 sm:px-5">
            <p className="text-footnote text-label-tertiary">
              On{' '}
              <Link
                to="/threads/$threadId"
                params={{ threadId: comment.postId }}
                className="font-semibold text-label hover:text-brand-text"
              >
                {comment.postTitle}
              </Link>{' '}
              · {timeAgo(comment.createdAt)}
            </p>
            <p className="mt-1 line-clamp-4 text-subhead whitespace-pre-line text-label">{comment.content}</p>
          </li>
        ))}
      </List>
      <FeedPagination page={data.page} hasMore={data.hasMore} />
    </>
  )
}

function ProfileRail({ profile }: { profile: Profile }) {
  const { data: insights } = useQuery(profileInsightsQuery(profile.id))
  const first = profile.name.split(' ')[0]

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
        <FollowingCard name={first} people={insights.following} total={insights.followingTotal} />
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
              to="/c/$channelId"
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
  name,
  people,
  total,
}: {
  name: string
  people: ProfileInsights['following']
  total: number
}) {
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <SectionLabel className="px-0">{name} follows</SectionLabel>
        <span className="text-caption-1 text-label-tertiary tabular">{compactNumber(total)}</span>
      </div>
      <ul role="list" className="mt-3 grid grid-cols-4 gap-x-2 gap-y-3">
        {people.map((person) => (
          <li key={person.id}>
            <Link
              to="/u/$userId"
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

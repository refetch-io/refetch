import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { PenLine } from 'lucide-react'
import { z } from 'zod'
import { FEED_MAX_PAGES } from '@/lib/constants'
import { profileQuery, userStoriesQuery } from '@/lib/queries'
import { FeedList } from '@/components/feed/feed-view'
import {
  ProfileColumn,
  profileHead,
  profileHeadData,
  profilePending,
} from '@/components/people/profile-shell'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_app/users/$userId/')({
  validateSearch: z.object({
    /** Old `?tab=comments` links, from before each tab had its own page. */
    tab: z.enum(['stories', 'comments']).optional().catch(undefined),
    page: z.number().int().min(2).max(FEED_MAX_PAGES).optional().catch(undefined),
  }),
  beforeLoad: ({ search, params }) => {
    if (search.tab === 'comments') {
      throw redirect({
        to: '/users/$userId/comments',
        params,
        search: { page: search.page },
        statusCode: 301,
      })
    }
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ context, params, deps }) => {
    const viewerId = context.user?.id ?? null
    const [profile] = await Promise.all([
      context.queryClient.ensureQueryData(profileQuery(params.userId, viewerId)),
      context.queryClient.ensureQueryData(userStoriesQuery(params.userId, deps.page, viewerId)),
    ])
    return profileHeadData(profile)
  },
  head: ({ loaderData, params }) => profileHead(loaderData, params.userId, 'stories'),
  pendingComponent: profilePending('stories'),
  component: StoriesPage,
})

function StoriesPage() {
  const { userId } = Route.useParams()
  const { page } = Route.useLoaderDeps()
  const { user } = Route.useRouteContext()
  const viewerId = user?.id ?? null
  const { data: profile } = useSuspenseQuery(profileQuery(userId, viewerId))
  const { data } = useSuspenseQuery(userStoriesQuery(userId, page, viewerId))
  const isSelf = profile.viewer?.isSelf ?? false

  return (
    <ProfileColumn profile={profile} tab="stories" feed={data}>
      <FeedList
        page={data}
        empty={
          isSelf
            ? {
                title: 'No stories yet',
                description: 'Stories you share show up here.',
                action: (
                  <Button asChild variant="primary" size="md">
                    <Link to="/submit">
                      <PenLine />
                      Submit a story
                    </Link>
                  </Button>
                ),
              }
            : { title: 'No stories yet', description: `${profile.name} hasn’t shared a story yet.` }
        }
      />
    </ProfileColumn>
  )
}

import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { followsQuery, profileQuery } from '@/lib/queries'
import { feedSearchSchema } from '@/components/feed/feed-layout'
import { PeopleList, ProfileColumn, profileMeta, profilePending } from '@/components/people/profile-shell'
export const Route = createFileRoute('/_app/users/$userId/following')({
  validateSearch: feedSearchSchema,
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ context, params, deps }) => {
    const [profile] = await Promise.all([
      context.queryClient.ensureQueryData(profileQuery(params.userId, context.user?.id ?? null)),
      context.queryClient.ensureQueryData(followsQuery(params.userId, 'following', deps.page)),
    ])
    return { name: profile.name, bio: profile.bio }
  },
  head: ({ loaderData, params }) => ({ meta: profileMeta(loaderData, params.userId, 'following') }),
  pendingComponent: profilePending('following'),
  component: FollowingPage,
})

function FollowingPage() {
  const { userId } = Route.useParams()
  const { page } = Route.useLoaderDeps()
  const { user } = Route.useRouteContext()
  const { data: profile } = useSuspenseQuery(profileQuery(userId, user?.id ?? null))
  const { data } = useSuspenseQuery(followsQuery(userId, 'following', page))

  return (
    <ProfileColumn profile={profile} tab="following" feed={{ ...data, posts: data.people }}>
      <PeopleList
        data={data}
        empty={
          profile.viewer?.isSelf
            ? {
                title: 'You’re not following anyone yet',
                description: 'Follow people to see their stories in your Following feed.',
              }
            : {
                title: 'Not following anyone yet',
                description: `${profile.name} isn’t following anyone yet.`,
              }
        }
      />
    </ProfileColumn>
  )
}

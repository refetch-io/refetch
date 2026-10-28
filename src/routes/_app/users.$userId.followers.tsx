import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { followsQuery, profileQuery } from '@/lib/queries'
import { feedSearchSchema } from '@/components/feed/feed-layout'
import {
  PeopleList,
  ProfileColumn,
  profileHead,
  profileHeadData,
  profilePending,
} from '@/components/people/profile-shell'
import { FollowButton } from '@/components/people/follow-button'
export const Route = createFileRoute('/_app/users/$userId/followers')({
  validateSearch: feedSearchSchema,
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ context, params, deps }) => {
    const [profile] = await Promise.all([
      context.queryClient.ensureQueryData(profileQuery(params.userId, context.user?.id ?? null)),
      context.queryClient.ensureQueryData(followsQuery(params.userId, 'followers', deps.page)),
    ])
    return profileHeadData(profile)
  },
  head: ({ loaderData, params }) => profileHead(loaderData, params.userId, 'followers'),
  pendingComponent: profilePending('followers'),
  component: FollowersPage,
})

function FollowersPage() {
  const { userId } = Route.useParams()
  const { page } = Route.useLoaderDeps()
  const { user } = Route.useRouteContext()
  const { data: profile } = useSuspenseQuery(profileQuery(userId, user?.id ?? null))
  const { data } = useSuspenseQuery(followsQuery(userId, 'followers', page))

  return (
    <ProfileColumn profile={profile} tab="followers" feed={{ ...data, posts: data.people }}>
      <PeopleList
        data={data}
        empty={
          profile.viewer?.isSelf
            ? { title: 'No followers yet', description: 'When people follow you, they’ll show up here.' }
            : {
                title: 'No followers yet',
                description: `Nobody follows ${profile.name} yet.`,
                action:
                  !profile.isBot && !profile.viewer?.following ? (
                    <FollowButton userId={profile.id} name={profile.name} following={false} size="md" />
                  ) : undefined,
              }
        }
      />
    </ProfileColumn>
  )
}

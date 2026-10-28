import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { UserRound } from 'lucide-react'
import { preloadWithin } from '@/lib/preload'
import { profileInsightsQuery, profileQuery } from '@/lib/queries'
import { FeedLayout } from '@/components/feed/feed-layout'
import { FeedSkeleton } from '@/components/feed/feed-view'
import { ProfileFrame } from '@/components/people/profile-shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/misc'

/** Longest the page waits for the sidebar, so it usually renders with it. */
const INSIGHTS_WAIT_MS = 300

/** Shared by every profile page: the card and rail live here, each tab is a child route. */
export const Route = createFileRoute('/_app/users/$userId')({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(profileQuery(params.userId, context.user?.id ?? null)),
      // Sidebar insights render with the page when quick, and never hold it up.
      preloadWithin(context.queryClient, profileInsightsQuery(params.userId), INSIGHTS_WAIT_MS),
    ])
  },
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
  component: ProfileLayout,
})

function ProfileLayout() {
  const { userId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const { data: profile } = useSuspenseQuery(profileQuery(userId, user?.id ?? null))
  return (
    <ProfileFrame profile={profile}>
      <Outlet />
    </ProfileFrame>
  )
}

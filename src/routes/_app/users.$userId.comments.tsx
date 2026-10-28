import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { MessageCircle } from 'lucide-react'
import { profileQuery, userCommentsQuery } from '@/lib/queries'
import { timeAgo } from '@/lib/utils'
import { feedSearchSchema } from '@/components/feed/feed-layout'
import { COLUMN_LIST, ProfileColumn, profileMeta, profilePending } from '@/components/people/profile-shell'
import { List, ListItem } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/misc'

export const Route = createFileRoute('/_app/users/$userId/comments')({
  validateSearch: feedSearchSchema,
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ context, params, deps }) => {
    const [profile] = await Promise.all([
      context.queryClient.ensureQueryData(profileQuery(params.userId, context.user?.id ?? null)),
      context.queryClient.ensureQueryData(userCommentsQuery(params.userId, deps.page)),
    ])
    return { name: profile.name, bio: profile.bio }
  },
  head: ({ loaderData, params }) => ({ meta: profileMeta(loaderData, params.userId, 'comments') }),
  pendingComponent: profilePending('comments'),
  component: CommentsPage,
})

function CommentsPage() {
  const { userId } = Route.useParams()
  const { page } = Route.useLoaderDeps()
  const { user } = Route.useRouteContext()
  const { data: profile } = useSuspenseQuery(profileQuery(userId, user?.id ?? null))
  const { data } = useSuspenseQuery(userCommentsQuery(userId, page))

  return (
    <ProfileColumn profile={profile} tab="comments" feed={{ ...data, posts: data.comments }}>
      {data.comments.length === 0 ? (
        <EmptyState
          icon={<MessageCircle />}
          title="No comments yet"
          description={
            profile.viewer?.isSelf
              ? 'Your comments on stories show up here.'
              : `${profile.name} hasn’t commented yet.`
          }
        />
      ) : (
        <List className={COLUMN_LIST} style={{ '--list-inset': '0px' } as React.CSSProperties}>
          {data.comments.map((comment) => (
            <ListItem key={comment.id} className="px-4 py-3.5 sm:px-5">
              <p className="text-footnote text-label-tertiary">
                On{' '}
                <Link
                  to="/threads/$threadId"
                  params={{ threadId: comment.postId }}
                  hash={`comment-${comment.id}`}
                  className="font-semibold text-label hover:text-brand-text"
                >
                  {comment.postTitle}
                </Link>{' '}
                · <span suppressHydrationWarning>{timeAgo(comment.createdAt)}</span>
              </p>
              <p className="mt-1 line-clamp-4 text-subhead whitespace-pre-line text-label">
                {comment.content}
              </p>
            </ListItem>
          ))}
        </List>
      )}
    </ProfileColumn>
  )
}

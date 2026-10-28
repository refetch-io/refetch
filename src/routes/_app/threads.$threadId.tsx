import * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { MessageCircleOff } from 'lucide-react'
import { preloadWithin } from '@/lib/preload'
import { channelDirectoryQuery, configQuery, threadQuery, threadStatsQuery } from '@/lib/queries'
import { buildCommentTree, type CommentNode } from '@/lib/comments'
import { type StructuredComment, breadcrumbs, discussionForumPosting, seo } from '@/lib/seo'
import type { Comment } from '@/lib/types'
import { isBotUser } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { SponsorCard } from '@/components/insights/insights-rail'
import { CommentsSection } from '@/components/thread/comments'
import { Composer } from '@/components/thread/composer'
import { BackButton, StoryHeader, StoryRailCard, StorySummary } from '@/components/thread/story-header'
import { ThreadStatsCard } from '@/components/thread/thread-stats'

/** Longest the page waits for its stats, so they usually render with it but never hold it up. */
const STATS_WAIT_MS = 300
/** Comments described in the page's structured data, best first, and how much of each. */
const STRUCTURED_COMMENTS = 50
const STRUCTURED_COMMENT_CHARS = 1000

/** The thread's best comments (and their replies) for search engines, kept small for the page payload. */
function structuredComments(comments: Array<Comment>): Array<StructuredComment> {
  let budget = STRUCTURED_COMMENTS
  const convert = (nodes: Array<CommentNode>): Array<StructuredComment> => {
    const out: Array<StructuredComment> = []
    for (const node of nodes) {
      const text = node.content.trim()
      if (budget <= 0) break
      if (!text) continue
      budget--
      out.push({
        id: node.id,
        author: { id: node.userId, name: node.userName, bot: isBotUser(node.userId) },
        text:
          text.length > STRUCTURED_COMMENT_CHARS ? `${text.slice(0, STRUCTURED_COMMENT_CHARS - 1)}…` : text,
        createdAt: node.createdAt,
        editedAt: node.editedAt,
        votes: node.count,
        replies: convert(node.children),
      })
    }
    return out
  }
  return convert(buildCommentTree(comments, 'top'))
}

export const Route = createFileRoute('/_app/threads/$threadId')({
  loader: async ({ context, params }) => {
    const [thread, config, directory] = await Promise.all([
      context.queryClient.ensureQueryData(threadQuery(params.threadId, context.user?.id ?? null)),
      context.queryClient.ensureQueryData(configQuery()),
      context.queryClient.ensureQueryData(channelDirectoryQuery(context.user?.id ?? null)),
      preloadWithin(context.queryClient, threadStatsQuery(params.threadId), STATS_WAIT_MS),
    ])
    const { post } = thread
    const channel = directory.channels.find((candidate) => candidate.id === post.channel)
    return {
      title: post.title,
      description: post.tldr ?? post.description,
      siteUrl: config.siteUrl,
      structured: {
        createdAt: post.createdAt,
        author: { id: post.userId, name: post.userName, bot: isBotUser(post.userId) },
        votes: post.count,
        commentCount: post.countComments,
        link: post.link,
        topics: post.topics,
        channel: channel ? { id: channel.id, name: channel.name } : null,
        comments: structuredComments(thread.comments),
      },
    }
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: seo({ title: 'Thread | Refetch', noindex: true }) }
    const { siteUrl, title, structured } = loaderData
    const url = `${siteUrl}/threads/${params.threadId}`
    const image = `${siteUrl}/api/og/thread/${params.threadId}`
    const description =
      loaderData.description ||
      `Discussion about ${title}. Join the conversation on Refetch, the open-source alternative to YC-controlled HN.`
    const channel = structured.channel
      ? { name: structured.channel.name, url: `${siteUrl}/channels/${structured.channel.id}` }
      : null
    return {
      meta: seo({
        title: `${title} | Refetch`,
        description,
        image,
        url,
        type: 'article',
        publishedTime: structured.createdAt,
      }),
      links: [{ rel: 'canonical', href: url }],
      scripts: [
        discussionForumPosting({
          siteUrl,
          url,
          headline: title,
          text: loaderData.description || title,
          image,
          createdAt: structured.createdAt,
          author: structured.author,
          votes: structured.votes,
          commentCount: structured.commentCount,
          link: structured.link,
          keywords: structured.topics,
          channel,
          comments: structured.comments,
        }),
        breadcrumbs([
          { name: 'Refetch', url: `${siteUrl}/` },
          ...(channel ? [channel] : []),
          { name: title, url },
        ]),
      ],
    }
  },
  pendingComponent: ThreadPending,
  notFoundComponent: ThreadNotFound,
  component: ThreadPage,
})

function ThreadPage() {
  const { threadId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const query = threadQuery(threadId, user?.id ?? null)
  const { data: thread } = useSuspenseQuery(query)
  const { data: config } = useSuspenseQuery(configQuery())
  const [replyingTo, setReplyingTo] = React.useState<CommentNode | null>(null)
  const [highlightId, setHighlightId] = React.useState<string | null>(null)

  // Links to a comment (from notifications) land on it and flash it.
  React.useEffect(() => {
    const match = /^#comment-([A-Za-z0-9._-]+)$/.exec(window.location.hash)
    if (!match) return
    setHighlightId(match[1])
    requestAnimationFrame(() => {
      document.getElementById(`comment-${match[1]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [threadId])

  const onPosted = React.useCallback((comment: Comment) => {
    setHighlightId(comment.id)
    requestAnimationFrame(() => {
      document
        .getElementById(`comment-${comment.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [])

  return (
    <div className="flex gap-8">
      <div className="mx-auto w-full max-w-3xl min-w-0 flex-1">
        <BackButton />
        <StoryHeader post={thread.post} siteUrl={config.siteUrl} />
        <StorySummary post={thread.post} />
        {/* Wide screens show the full card in the rail. */}
        <ThreadStatsCard postId={thread.post.id} compact className="mt-3 xl:hidden" />
        <CommentsSection
          thread={thread}
          queryKey={query.queryKey}
          highlightId={highlightId}
          onReply={setReplyingTo}
        />
        <Composer
          postId={thread.post.id}
          queryKey={query.queryKey}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onPosted={onPosted}
        />
      </div>
      <aside
        aria-label="Story details"
        className="sticky top-[76px] hidden w-[300px] shrink-0 space-y-4 self-start xl:block"
      >
        <StoryRailCard post={thread.post} />
        <ThreadStatsCard postId={thread.post.id} />
        <SponsorCard />
      </aside>
    </div>
  )
}

function ThreadPending() {
  return (
    <div className="mx-auto w-full max-w-3xl xl:mx-0">
      <Skeleton className="mb-4 h-8 w-20 rounded-full" />
      <Card className="p-6">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-5" />
            <Skeleton className="size-8 rounded-full" />
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-11/12 rounded-full" />
            <Skeleton className="h-7 w-2/3 rounded-full" />
            <Skeleton className="h-4 w-64 rounded-full" />
            <div className="flex gap-2 pt-3">
              <Skeleton className="h-9 w-36 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </Card>
      <Card className="mt-3 space-y-2.5 p-5">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-5/6 rounded-full" />
      </Card>
    </div>
  )
}

function ThreadNotFound() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <Card>
        <EmptyState
          icon={<MessageCircleOff />}
          title="Thread not found"
          description="This story doesn’t exist anymore, or the link is incorrect."
          action={
            <Button asChild variant="primary" size="md">
              <Link to="/">Back to Top Stories</Link>
            </Button>
          }
        />
      </Card>
    </div>
  )
}

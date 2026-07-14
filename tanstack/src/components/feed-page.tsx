import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { FeedRightSidebar } from '@/components/feed-right-sidebar'
import { PostCard } from '@/components/post-card'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api/client'
import { calculateOptimisticVoteState } from '@/lib/vote-state'
import type { Post, SortType, VoteState } from '@/lib/types'
import { reportPresenceActivity, clearPresenceActivity } from '@/lib/presence'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 25
const NEW_POSTS_POLL_MS = 60_000

interface FeedPageProps {
  initialPosts: Post[]
  initialTotal: number
  sort: SortType
  title: string
  description?: string
  userId?: string
}

function newestCreatedAt(posts: Post[]) {
  return posts.reduce<string | null>((latest, post) => {
    if (!post.createdAt) return latest
    if (!latest || post.createdAt > latest) return post.createdAt
    return latest
  }, null)
}

export function FeedPage({
  initialPosts,
  initialTotal,
  sort,
  title,
  description,
  userId,
}: FeedPageProps) {
  const { isAuthenticated } = useAuth()
  const [posts, setPosts] = useState(initialPosts)
  const [total, setTotal] = useState(initialTotal)
  const [offset, setOffset] = useState(initialPosts.length)
  const [loadingMore, setLoadingMore] = useState(false)
  const [voteStates, setVoteStates] = useState<Record<string, VoteState>>({})
  const [votingIds, setVotingIds] = useState<Record<string, boolean>>({})
  const [pendingPosts, setPendingPosts] = useState<Post[]>([])
  const sinceRef = useRef(new Date().toISOString())
  const postsRef = useRef(initialPosts)
  const enableNewPostsCheck = sort !== 'mines'
  postsRef.current = posts

  useEffect(() => {
    setPosts(initialPosts)
    setTotal(initialTotal)
    setOffset(initialPosts.length)
    setPendingPosts([])
    sinceRef.current =
      newestCreatedAt(initialPosts) ?? new Date().toISOString()
    setVoteStates(
      Object.fromEntries(
        initialPosts.map((post) => [
          post.id,
          { currentVote: null, count: post.count },
        ]),
      ),
    )
  }, [initialPosts, initialTotal])

  useEffect(() => {
    if (!isAuthenticated || posts.length === 0) return
    ;(async () => {
      try {
        const voteMap = await api.getVotesBatch(
          posts.map((p) => ({ id: p.id, type: 'post' as const })),
        )
        setVoteStates((prev) => {
          const next = { ...prev }
          for (const post of posts) {
            const key = `post:${post.id}`
            next[post.id] = {
              currentVote: voteMap[key] ?? null,
              count: next[post.id]?.count ?? post.count,
            }
          }
          return next
        })
      } catch {
        // ignore
      }
    })()
  }, [isAuthenticated, posts])

  useEffect(() => {
    if (!enableNewPostsCheck) return

    const checkForNewPosts = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const result = await api.listPosts({
          sort,
          limit: 25,
          offset: 0,
          userId,
          since: sinceRef.current,
        })
        const currentIds = new Set(postsRef.current.map((post) => post.id))
        const fresh = result.data
          .filter((post) => !currentIds.has(post.id))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        setPendingPosts(fresh)
      } catch {
        // ignore transient poll failures
      }
    }

    const intervalId = window.setInterval(checkForNewPosts, NEW_POSTS_POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void checkForNewPosts()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enableNewPostsCheck, sort, userId])

  const revealPendingPosts = () => {
    if (pendingPosts.length === 0) return
    setPosts((prev) => {
      const existing = new Set(prev.map((p) => p.id))
      const incoming = pendingPosts.filter((p) => !existing.has(p.id))
      return [...incoming, ...prev]
    })
    setVoteStates((prev) => {
      const next = { ...prev }
      for (const post of pendingPosts) {
        if (!next[post.id]) {
          next[post.id] = { currentVote: null, count: post.count }
        }
      }
      return next
    })
    setOffset((prev) => prev + pendingPosts.length)
    setTotal((prev) => prev + pendingPosts.length)
    sinceRef.current = new Date().toISOString()
    setPendingPosts([])
  }

  const handleVote = async (itemId: string, direction: 'up' | 'down') => {
    const current = voteStates[itemId] ?? { currentVote: null, count: 0 }
    const optimistic = calculateOptimisticVoteState(
      current.currentVote,
      direction,
      current.count,
    )
    setVotingIds((prev) => ({ ...prev, [itemId]: true }))
    setVoteStates((prev) => ({ ...prev, [itemId]: optimistic }))
    reportPresenceActivity(direction === 'up' ? 'Upvoting' : 'Downvoting')

    try {
      const result = await api.castVote({
        resourceId: itemId,
        resourceType: 'post',
        voteType: direction,
      })
      setVoteStates((prev) => ({
        ...prev,
        [itemId]: {
          currentVote: result.voteType,
          count: result.count,
          countUp: result.countUp,
          countDown: result.countDown,
        },
      }))
    } catch (error) {
      setVoteStates((prev) => ({ ...prev, [itemId]: current }))
      console.error(error)
    } finally {
      setVotingIds((prev) => ({ ...prev, [itemId]: false }))
      clearPresenceActivity()
    }
  }

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const result = await api.listPosts({
        sort,
        limit: PAGE_SIZE,
        offset,
        userId,
      })
      setPosts((prev) => [...prev, ...result.data])
      setOffset((prev) => prev + result.data.length)
      setTotal(result.total)
    } finally {
      setLoadingMore(false)
    }
  }

  const pendingCount = pendingPosts.length
  const pendingLabel =
    pendingCount === 1
      ? '1 new story is available'
      : `${pendingCount} new stories are available`

  return (
    <main className="relative flex min-w-0 flex-col gap-6">
      <div className="flex w-full gap-0 px-8 sm:px-12 lg:gap-10 lg:px-16">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {pendingCount > 0 ? (
            <div className="sticky top-0 z-30 -mb-2">
              <div className="flex justify-center py-2">
                <button
                  type="button"
                  onClick={revealPendingPosts}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors',
                    'hover:bg-muted',
                  )}
                >
                  <ArrowUp className="size-3.5 text-[var(--brand)]" />
                  <span>{pendingLabel}</span>
                  <span className="text-[var(--brand)]">Show latest</span>
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {title}
            </h1>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>

          {posts.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyTitle>No posts yet</EmptyTitle>
                <EmptyDescription>
                  Nothing matched this feed right now. Try again later or submit
                  a link.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="divide-y divide-border/60 border-y border-border/60">
              {posts.map((item) => (
                <PostCard
                  key={item.id}
                  item={item}
                  voteState={
                    voteStates[item.id] ?? {
                      currentVote: null,
                      count: item.count,
                    }
                  }
                  isVoting={!!votingIds[item.id]}
                  onVote={handleVote}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          )}

          {offset < total ? (
            <div className="flex justify-center pt-2">
              <Button onClick={loadMore} disabled={loadingMore} variant="outline">
                {loadingMore ? <Spinner data-icon="inline-start" /> : null}
                Load more
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="hidden w-72 shrink-0 border-l border-border/60 pl-8 lg:block">
          <div className="sticky top-6 z-10">
            <FeedRightSidebar />
          </div>
        </aside>
      </div>
    </main>
  )
}

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  Clock3,
  Hash,
  Link2,
  Share,
  TextAlignStart,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { deleteStory } from '@/api/content'
import { trackPostClick } from '@/lib/analytics'
import { useSession } from '@/lib/session'
import { copyToClipboard } from '@/lib/share'
import type { PostDetail } from '@/lib/types'
import { withRef } from '@/lib/url'
import { formatDateTime, isBotUser, timeAgo } from '@/lib/utils'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Dot } from '../ui/misc'
import { BotBadge } from '../bot-badge'
import { Favicon } from '../favicon'
import { VoteControl } from '../vote-control'
import { ChannelTag } from '../channels/channel-parts'
import { ShareDialog } from '../messages/share-dialog'
import { useJoinGate } from '../auth/join-gate'

export function BackButton() {
  const router = useRouter()
  const canGoBack = router.history.canGoBack()
  return (
    <Button
      variant="plain"
      size="sm"
      className="mb-3 -ml-2 gap-0.5 px-2"
      onClick={() => (canGoBack ? router.history.back() : router.navigate({ to: '/' }))}
    >
      <ChevronLeft className="!size-5" strokeWidth={2.4} />
      {canGoBack ? 'Back' : 'Top Stories'}
    </Button>
  )
}

export function StoryHeader({ post, siteUrl }: { post: PostDetail; siteUrl: string }) {
  const { user } = useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const removeStory = useServerFn(deleteStory)
  const [confirming, setConfirming] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [sharing, setSharing] = React.useState(false)
  const gate = useJoinGate()

  const permalink = `${siteUrl}/threads/${post.id}`
  const isOwner = user?.id === post.userId

  const onDelete = async () => {
    setDeleting(true)
    try {
      const result = await removeStory({ data: { id: post.id } })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Story deleted')
      queryClient.removeQueries({ queryKey: ['thread', post.id] })
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
      await queryClient.invalidateQueries({ queryKey: ['mine'] })
      await navigate({ to: '/' })
    } catch {
      toast.error('Couldn’t delete this story. Please try again.')
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <Card className="animate-rise-in p-4 sm:p-6">
      <div className="flex gap-3 sm:gap-4">
        <VoteControl
          type="post"
          id={post.id}
          initial={{ vote: post.vote, count: post.count }}
          size="lg"
          className="-mt-1 -ml-1"
        />
        <div className="min-w-0 flex-1">
          {post.type === 'show' && (
            <Badge variant="brand" size="sm" className="mb-2">
              Show RF
            </Badge>
          )}
          <h1 className="text-title-2 text-balance text-label sm:text-title-1">{post.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-footnote text-label-secondary">
            {post.channel && (
              <>
                <ChannelTag channelId={post.channel} />
                <Dot />
              </>
            )}
            <Favicon domain={post.domain} size={18} />
            <span className="font-medium text-label">{post.domain ?? 'refetch.io'}</span>
            <Dot />
            <time dateTime={post.createdAt} title={formatDateTime(post.createdAt)} suppressHydrationWarning>
              {timeAgo(post.createdAt)}
            </time>
            <Dot />
            <span className="inline-flex items-center gap-1.5">
              by{' '}
              <Link
                to="/u/$userId"
                params={{ userId: post.userId }}
                className="inline-flex items-center gap-1.5 font-medium text-label hover:text-brand-text"
              >
                <Avatar name={post.userName} userId={post.userId} size={18} />
                {post.userName}
              </Link>
              {isBotUser(post.userId) && <BotBadge />}
            </span>
            {post.readingTime && (
              <>
                <Dot className="max-sm:hidden" />
                <span className="inline-flex items-center gap-1 max-sm:hidden">
                  <Clock3 className="size-3.5" aria-hidden />
                  {post.readingTime} min read
                </span>
              </>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {post.link && (
              <Button asChild variant="primary" size="md">
                <a
                  href={withRef(post.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => {
                    if (gate(event, post)) trackPostClick(post.id, post.title, true)
                  }}
                  onAuxClick={(event) => gate(event, post)}
                >
                  <BookOpen />
                  Read article
                  <ArrowUpRight className="-ml-0.5 opacity-70" />
                </a>
              </Button>
            )}
            <Button variant="secondary" size="md" onClick={() => setSharing(true)}>
              <Share />
              Share
            </Button>
            <ShareDialog post={post} url={permalink} open={sharing} onOpenChange={setSharing} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Copy link"
              title="Copy link"
              className="max-sm:hidden"
              onClick={() => copyToClipboard(permalink)}
            >
              <Link2 />
            </Button>
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete story"
                title="Delete story"
                className="ml-auto hover:bg-down-tint hover:text-down"
                onClick={() => setConfirming(true)}
              >
                <Trash2 />
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this story?"
        description="It will be removed from Refetch for everyone. This can’t be undone."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={onDelete}
      />
    </Card>
  )
}

/** AI-generated TL;DR and topics from the Enhancement function. */
export function StorySummary({ post }: { post: PostDetail }) {
  if (!post.tldr && post.topics.length === 0) return null
  return (
    <Card className="mt-3 animate-rise-in p-4 [animation-delay:60ms] sm:p-5">
      {post.tldr && (
        <>
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-[7px] bg-brand-tint text-brand-text">
              <TextAlignStart className="size-3.5" strokeWidth={2.4} aria-hidden />
            </span>
            <h2 className="text-subhead font-semibold text-label">Summary</h2>
            <span className="text-caption-1 text-label-tertiary">Generated by AI</span>
          </div>
          <p className="mt-2.5 text-callout leading-relaxed text-pretty text-label-secondary">{post.tldr}</p>
        </>
      )}
      {post.topics.length > 0 && (
        <ul
          className={post.tldr ? 'mt-4 flex flex-wrap gap-1.5' : 'flex flex-wrap gap-1.5'}
          aria-label="Topics"
        >
          {post.topics.map((topic) => (
            <li key={topic}>
              <Badge variant="neutral" size="md" className="gap-0.5 font-medium">
                <Hash className="!size-3 text-label-tertiary" aria-hidden />
                {topic}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function StoryRailCard({ post }: { post: PostDetail }) {
  const rows: Array<[string, React.ReactNode]> = [
    ['Source', post.domain ?? 'refetch.io'],
    [
      'Posted',
      <span key="posted" suppressHydrationWarning>
        {formatDateTime(post.createdAt)}
      </span>,
    ],
    ['Points', post.count],
    ['Comments', post.countComments],
  ]
  if (post.readingTime) rows.push(['Reading time', `${post.readingTime} min`])
  if (post.readingLevel) rows.push(['Level', post.readingLevel])

  return (
    <Card className="p-4">
      <h2 className="text-caption-1 font-semibold tracking-[0.06em] text-label-tertiary uppercase">
        About this story
      </h2>
      <dl className="mt-3 space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 text-footnote">
            <dt className="shrink-0 text-label-secondary">{label}</dt>
            <dd className="min-w-0 truncate text-right font-medium text-label tabular">{value}</dd>
          </div>
        ))}
      </dl>
      <Link
        to="/"
        className="mt-4 flex h-9 items-center justify-center rounded-full bg-fill-secondary text-footnote font-semibold text-label-secondary transition-colors hover:bg-fill hover:text-label"
      >
        More top stories
      </Link>
    </Card>
  )
}

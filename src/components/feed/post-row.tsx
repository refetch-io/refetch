import { Link } from '@tanstack/react-router'
import { ArrowUpRight, MessageCircle } from 'lucide-react'
import { trackArticleOpen, trackPostClick } from '@/lib/analytics'
import type { Post } from '@/lib/types'
import { withRef } from '@/lib/url'
import { cn, formatDateTime, timeAgo } from '@/lib/utils'
import { newCommentCount, useVisit } from '@/lib/visits'
import { Badge } from '../ui/badge'
import { ListItem } from '../ui/card'
import { Dot } from '../ui/misc'
import { Favicon } from '../favicon'
import { VoteControl } from '../vote-control'
import { ChannelTag, useChannels } from '../channels/channel-parts'
import { useJoinGate } from '../auth/join-gate'
import { SaveButton } from '../saved/save-button'
import { StoryMuteMenu } from '../mutes/mute-parts'
import { PersonBadges } from '../verified-badge'
import { PersonHoverCard } from '../people/person-hover-card'

export function PostRow({
  post,
  rank,
  demo,
  hideChannel,
}: {
  post: Post
  rank?: number
  demo?: boolean
  /** Inside a channel feed every row belongs to it, so the tag is noise. */
  hideChannel?: boolean
}) {
  const external = Boolean(post.link)
  const { byId } = useChannels()
  const gate = useJoinGate()
  const hasChannel = !hideChannel && Boolean(post.channel && byId.has(post.channel))
  // Comments since you last opened the thread (this browser only).
  const fresh = newCommentCount(useVisit(post.id), post.countComments)
  const commentsLabel = `${post.countComments} comments${fresh > 0 ? `, ${fresh} new` : ''} on “${post.title}”`
  const titleClass =
    'text-label decoration-brand-text/30 underline-offset-[3px] transition-colors hover:text-brand-text focus-visible:rounded-sm'

  return (
    <ListItem
      data-kb-item
      className="group/row flex items-center gap-2 py-2.5 pr-3 pl-2 transition-colors duration-200 hover:bg-fill-secondary/50 sm:pr-4"
    >
      {rank !== undefined && (
        <span
          aria-hidden
          className={cn(
            'w-6 shrink-0 text-right font-rounded text-footnote font-semibold tabular',
            rank <= 3 ? 'text-brand-text' : 'text-label-quaternary',
          )}
        >
          {rank}
        </span>
      )}

      <VoteControl
        type="post"
        id={post.id}
        initial={{ vote: post.vote, count: post.count }}
        size="sm"
        demo={demo}
        className="w-8"
      />

      <div className="min-w-0 flex-1 py-0.5">
        <h2
          title={post.title}
          className="truncate text-[15px] leading-[1.35] font-semibold tracking-[-0.01em] sm:text-callout sm:leading-[1.35]"
        >
          {post.type === 'show' && (
            <Badge variant="brand" size="xs" className="mr-1.5 -translate-y-px align-middle">
              Show RF
            </Badge>
          )}
          {external ? (
            <a
              href={withRef(post.link!)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                const allowed = gate(event, post)
                trackArticleOpen(post.id, 'feed', !allowed)
                if (allowed) trackPostClick(post.id, post.title, true)
              }}
              onAuxClick={(event) => {
                const allowed = gate(event, post)
                if (event.button === 1) trackArticleOpen(post.id, 'feed', !allowed)
              }}
              data-kb-action="open"
              className={titleClass}
            >
              {post.title}
              <ArrowUpRight
                aria-hidden
                className="ml-0.5 inline size-3.5 -translate-y-px text-label-tertiary opacity-0 transition-opacity group-hover/row:opacity-100"
              />
            </a>
          ) : (
            <Link
              to="/threads/$threadId"
              params={{ threadId: post.id }}
              onClick={() => trackPostClick(post.id, post.title, false)}
              data-kb-action="open"
              className={titleClass}
            >
              {post.title}
            </Link>
          )}
        </h2>

        <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-footnote text-label-secondary">
          <Favicon domain={post.domain} size={16} />
          {post.domain ? (
            <Link
              to="/from/$domain"
              params={{ domain: post.domain }}
              title={`More from ${post.domain}`}
              className="truncate hover:text-brand-text"
            >
              {post.domain}
            </Link>
          ) : (
            <span className="truncate">refetch.io</span>
          )}
          <Dot />
          <time
            dateTime={post.createdAt}
            title={formatDateTime(post.createdAt)}
            className="shrink-0"
            suppressHydrationWarning
          >
            {timeAgo(post.createdAt)}
          </time>
          <Dot className="max-sm:hidden" />
          <PersonHoverCard userId={post.userId} name={post.userName}>
            <Link
              to="/users/$userId"
              params={{ userId: post.userId }}
              className="truncate hover:text-brand-text max-sm:hidden"
            >
              {post.userName}
            </Link>
          </PersonHoverCard>
          <span className="-ml-0.5 inline-flex shrink-0 max-sm:hidden">
            <PersonBadges userId={post.userId} size={13} plain />
          </span>
          {hasChannel && (
            <>
              <Dot />
              <ChannelTag channelId={post.channel} />
            </>
          )}
          <Dot className="sm:hidden" />
          <Link
            to="/threads/$threadId"
            params={{ threadId: post.id }}
            onClick={() => trackPostClick(post.id, post.title, false)}
            aria-label={commentsLabel}
            className={cn(
              'inline-flex shrink-0 items-center gap-1 font-medium tabular sm:hidden',
              fresh > 0 && 'text-brand-text',
            )}
          >
            <MessageCircle className="size-3.5" strokeWidth={2.2} aria-hidden />
            {post.countComments}
            {fresh > 0 && <span className="font-semibold">+{fresh}</span>}
          </Link>
        </div>
      </div>

      {!demo && <StoryMuteMenu post={post} quiet className="-mr-1.5 max-sm:hidden" />}
      {!demo && <SaveButton postId={post.id} quiet className="max-sm:hidden" />}
      <Link
        to="/threads/$threadId"
        params={{ threadId: post.id }}
        onClick={() => trackPostClick(post.id, post.title, false)}
        aria-label={commentsLabel}
        title={fresh > 0 ? `${fresh} new since your last visit` : undefined}
        data-kb-action="comments"
        className={cn(
          'inline-flex h-7 shrink-0 pressable items-center gap-1 rounded-full px-2.5 text-footnote font-semibold tabular hover:bg-brand-tint hover:text-brand-text max-sm:hidden',
          fresh > 0 ? 'bg-brand-tint text-brand-text' : 'bg-fill-secondary text-label-secondary',
        )}
      >
        <MessageCircle className="size-3.5" strokeWidth={2.2} aria-hidden />
        {post.countComments}
        {fresh > 0 && <span className="text-caption-1 opacity-80">+{fresh}</span>}
      </Link>
    </ListItem>
  )
}

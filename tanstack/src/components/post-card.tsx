import { Link } from '@tanstack/react-router'
import { ChevronDown, ChevronUp, ExternalLink, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Favicon } from '@/components/favicon'
import type { Post, VoteState } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PostCardProps {
  item: Post
  voteState: VoteState
  isVoting: boolean
  onVote: (itemId: string, direction: 'up' | 'down') => void
  isAuthenticated: boolean
}

export function PostCard({
  item,
  voteState,
  isVoting,
  onVote,
  isAuthenticated,
}: PostCardProps) {
  const hasExternalLink = !!item.link?.startsWith('http')
  const href =
    hasExternalLink && item.link
      ? `${item.link}${item.link.includes('?') ? '&' : '?'}ref=refetch.io`
      : undefined

  const vote = (direction: 'up' | 'down') => {
    if (!isAuthenticated) {
      window.location.href = '/signin'
      return
    }
    onVote(item.id, direction)
  }

  return (
    <article>
      <div className="flex w-full items-center gap-3 py-3.5">
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isVoting}
            onClick={() => vote('up')}
            className={cn(
              'size-5 [&_svg:not([class*="size-"])]:size-3',
              voteState.currentVote === 'up' &&
                'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-400',
            )}
            aria-label="Upvote"
          >
            <ChevronUp />
          </Button>
          <span
            className={cn(
              'text-[11px] leading-none font-medium tabular-nums',
              voteState.currentVote === 'up' &&
                'text-emerald-600 dark:text-emerald-400',
              voteState.currentVote === 'down' && 'text-destructive',
            )}
          >
            {voteState.count}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isVoting}
            onClick={() => vote('down')}
            className={cn(
              'size-5 [&_svg:not([class*="size-"])]:size-3',
              voteState.currentVote === 'down' &&
                'bg-destructive/15 text-destructive hover:bg-destructive/15 hover:text-destructive',
            )}
            aria-label="Downvote"
          >
            <ChevronDown />
          </Button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {item.type === 'show' && (
              <Badge variant="brand" className="h-[1.125rem] px-1.5 text-[10px] tracking-wide uppercase">
                Show
              </Badge>
            )}
            <h2 className="font-sans text-base leading-snug font-normal">
              <Link
                to="/threads/$threadId"
                params={{ threadId: item.id }}
                className="hover:underline"
              >
                {item.title}
              </Link>
            </h2>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                source
                <ExternalLink className="size-3" />
              </a>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Favicon domain={item.domain} size={14} />
            <span>{item.domain.replace(/^www\./, '')}</span>
            {item.timeAgo && (
              <>
                <span aria-hidden>•</span>
                <span>{item.timeAgo}</span>
              </>
            )}
            <span aria-hidden>•</span>
            <span>{item.author}</span>
            <span aria-hidden>•</span>
            <Link
              to="/threads/$threadId"
              params={{ threadId: item.id }}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <MessageSquare className="size-3" />
              {item.countComments}{' '}
              {item.countComments === 1 ? 'comment' : 'comments'}
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

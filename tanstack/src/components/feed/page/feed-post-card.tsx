import {
  ArrowBigDown,
  ArrowBigUp,
  Bookmark,
  MessageSquare,
  MoreHorizontal,
  Share2,
} from "lucide-react"
import { useState } from "react"

import { FeedPanel } from "@/components/feed/page/feed-panel"
import { CommunityAvatarBadge } from "@/components/ui/refetch-avatar"
import { formatCount } from "@/lib/feed/format-count"
import type { SocialFeedPost } from "@/lib/feed/social-post"
import { cn } from "@/lib/utils"

export function FeedPostCard({ post }: { post: SocialFeedPost }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null)

  return (
    <FeedPanel className="mb-3 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <CommunityAvatarBadge
            seed={post.community}
            className="size-6 text-[10px]"
          />
          <span className="text-foreground truncate font-semibold">{post.community}</span>
          <span className="text-muted-foreground shrink-0">·</span>
          <span className="text-muted-foreground truncate">
            Posted by {post.author}
          </span>
          <span className="text-muted-foreground shrink-0">·</span>
          <span className="text-muted-foreground shrink-0">{post.submittedAt}</span>
        </div>
        <button
          type="button"
          aria-label="More options"
          className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1 transition-colors hover:bg-muted"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      <h2 className="text-foreground mb-2 text-base leading-snug font-semibold md:text-[17px]">
        {post.title}
      </h2>

      {post.body ? (
        <p className="text-muted-foreground mb-3 text-sm leading-relaxed">{post.body}</p>
      ) : null}

      {post.codeSnippet ? (
        <pre className="bg-background/80 mb-3 overflow-x-auto rounded-xl border border-border p-3 text-xs leading-relaxed text-emerald-700 dark:text-emerald-300/90">
          <code>{post.codeSnippet}</code>
        </pre>
      ) : null}

      {post.imageGradient ? (
        <div
          className={cn(
            "mb-3 aspect-[16/9] w-full rounded-xl bg-gradient-to-br ring-1 ring-border",
            post.imageGradient,
          )}
        />
      ) : null}

      {post.tags && post.tags.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-foreground/80 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-0.5 rounded-full bg-muted px-1 py-0.5 ring-1 ring-border">
            <button
              type="button"
              aria-label="Upvote"
              onClick={() => setVote(vote === "up" ? null : "up")}
              className={cn(
                "cursor-pointer rounded-full p-1 transition-colors",
                vote === "up"
                  ? "text-[var(--feed-up)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ArrowBigUp className={cn("size-4", vote === "up" && "fill-current")} />
            </button>
            <span className="text-foreground min-w-[2.5ch] text-center text-xs font-semibold tabular-nums">
              {formatCount(post.score)}
            </span>
            <button
              type="button"
              aria-label="Downvote"
              onClick={() => setVote(vote === "down" ? null : "down")}
              className={cn(
                "cursor-pointer rounded-full p-1 transition-colors",
                vote === "down"
                  ? "text-[var(--feed-down)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ArrowBigDown className={cn("size-4", vote === "down" && "fill-current")} />
            </button>
          </div>

          <button
            type="button"
            className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <MessageSquare className="size-3.5" />
            {formatCount(post.commentCount)}
          </button>

          <button
            type="button"
            className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <Share2 className="size-3.5" />
            Share
          </button>
        </div>

        <button
          type="button"
          aria-label="Save"
          className="text-muted-foreground hover:text-foreground cursor-pointer rounded-full p-1.5 transition-colors hover:bg-muted"
        >
          <Bookmark className="size-4" />
        </button>
      </div>
    </FeedPanel>
  )
}

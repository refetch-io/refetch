import type { ReactNode } from "react"

import { FeedVote, type FeedVoteAppearance } from "@/components/feed/feed-vote"
import {
  FeedActionBar,
  FeedDomainPill,
  FeedExternalButton,
  FeedMeta,
  FeedTitle,
  cleanDomain,
} from "@/components/feed/feed-post-parts"
import { Badge } from "@/components/ui/badge"
import type { FeedPost } from "@/lib/feed/types"
import type { FeedDesignVariantId } from "@/lib/feed/variants"
import { cn } from "@/lib/utils"

export type FeedLayoutMode = FeedDesignVariantId

type FeedPostShellProps = {
  post: FeedPost
  mode: FeedLayoutMode
}

type ShellConfig = {
  wrapper: string
  inner: string
  vote: FeedVoteAppearance
  voteClass?: string
  showVoteRail?: boolean
  titleClass?: string
  metaClass?: string
  extra?: (post: FeedPost, group: string) => ReactNode
}

const SHELL: Record<FeedLayoutMode, ShellConfig> = {
  classic: {
    wrapper:
      "feed-post group/post rounded-xl bg-card/80 ring-1 ring-border/80 transition-colors hover:bg-card hover:ring-border",
    inner: "flex gap-0",
    vote: "rail",
    showVoteRail: true,
  },
  minimal: {
    wrapper:
      "feed-post group/post border-b border-border/60 bg-transparent py-0 transition-colors last:border-b-0 hover:bg-muted/30",
    inner: "flex gap-0 px-1",
    vote: "rail",
    voteClass: "bg-transparent ring-0",
    showVoteRail: true,
  },
  glass: {
    wrapper:
      "feed-post group/post rounded-xl border border-border/50 bg-card/40 shadow-xs backdrop-blur-sm transition-all hover:border-border hover:bg-card/60 hover:shadow-sm",
    inner: "flex gap-0",
    vote: "rail",
    showVoteRail: true,
  },
  compact: {
    wrapper:
      "feed-post group/post rounded-lg bg-muted/20 ring-1 ring-border/50 transition-colors hover:bg-muted/35",
    inner: "flex items-center gap-3 px-3 py-2",
    vote: "inline",
    showVoteRail: false,
  },
  magazine: {
    wrapper:
      "feed-post group/post overflow-hidden rounded-xl bg-card ring-1 ring-border/80 transition-colors hover:ring-primary/20",
    inner: "flex flex-col gap-3 p-4 sm:p-5",
    vote: "inline",
    showVoteRail: false,
    titleClass: "text-base font-semibold tracking-tight sm:text-lg",
    extra: (post) => (
      <div className="flex items-center justify-between gap-2">
        <FeedDomainPill domain={post.domain} />
        <span className="text-muted-foreground text-xs tabular-nums">{post.submittedAt}</span>
      </div>
    ),
  },
  timeline: {
    wrapper: "feed-post group/post relative pl-6",
    inner: "flex gap-0",
    vote: "rail",
    showVoteRail: true,
    extra: () => (
      <>
        <span className="bg-primary/80 ring-background absolute top-5 left-[7px] z-10 size-2 rounded-full ring-2" />
        <span className="bg-border/80 absolute top-6 bottom-0 left-[10px] w-px" />
      </>
    ),
  },
  terminal: {
    wrapper:
      "feed-post group/post overflow-hidden rounded-xl bg-muted/25 font-mono ring-1 ring-border/60 transition-colors hover:bg-muted/40",
    inner: "flex flex-col",
    vote: "inline",
    showVoteRail: false,
    titleClass: "text-sm font-medium",
    metaClass: "text-[11px] uppercase tracking-wide",
    extra: (post) => (
      <div className="border-border/80 text-muted-foreground flex items-center gap-2 border-b px-3 py-1.5 text-[10px] tracking-wider">
        <span className="text-primary/90">refetch</span>
        <span className="text-border">/</span>
        <span className="truncate">{cleanDomain(post.domain)}</span>
      </div>
    ),
  },
  neon: {
    wrapper:
      "feed-post group/post relative overflow-hidden rounded-xl bg-card ring-1 ring-primary/15 transition-all hover:ring-primary/30 hover:shadow-[0_0_24px_-8px] hover:shadow-primary/15",
    inner: "flex gap-0",
    vote: "rail",
    voteClass: "border-primary/10 bg-primary/5",
    showVoteRail: true,
    extra: () => (
      <span className="from-primary/50 pointer-events-none absolute inset-y-3 left-0 w-0.5 rounded-full bg-linear-to-b to-primary/10" />
    ),
  },
  split: {
    wrapper:
      "feed-post group/post overflow-hidden rounded-xl bg-card ring-1 ring-border/80 transition-colors hover:bg-muted/20",
    inner: "flex",
    vote: "rail",
    voteClass: "min-h-full rounded-none border-0 border-l bg-muted/30 ring-0",
    showVoteRail: false,
  },
  stacked: {
    wrapper:
      "feed-post group/post relative rounded-xl bg-card p-4 pt-5 ring-1 ring-border/80 transition-colors hover:bg-muted/15",
    inner: "flex flex-col gap-3",
    vote: "inline",
    showVoteRail: false,
    titleClass: "text-[15px] font-semibold leading-snug",
    extra: (post) => (
      <Badge
        variant="secondary"
        className="absolute top-3 right-3 tabular-nums shadow-none"
      >
        {post.score}
      </Badge>
    ),
  },
}

function PostBody({
  post,
  group,
  titleClass,
  metaClass,
  hideMeta,
}: {
  post: FeedPost
  group: string
  titleClass?: string
  metaClass?: string
  hideMeta?: boolean
}) {
  return (
    <div className="min-w-0 flex-1 space-y-1 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-start gap-1.5">
        <FeedTitle post={post} titleClassName={cn("text-[15px] sm:text-base", titleClass)} />
        <FeedExternalButton
          post={post}
          className={cn(
            "text-muted-foreground mt-0.5 shrink-0 opacity-0 transition-opacity",
            group,
          )}
        />
      </div>
      {!hideMeta ? <FeedMeta post={post} className={metaClass} /> : null}
      <FeedActionBar post={post} className="pt-0.5" />
    </div>
  )
}

export function FeedPostShell({ post, mode }: FeedPostShellProps) {
  const config = SHELL[mode]
  const group = "group-hover/post:opacity-100"

  if (mode === "compact") {
    return (
      <article className={cn(config.wrapper, "group/post")} data-feed-layout={mode}>
        <div className={config.inner}>
          <FeedDomainPill domain={post.domain} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <FeedTitle post={post} titleClassName="text-sm font-medium" />
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {post.submittedAt} · {post.commentCount} comments
            </p>
          </div>
          <FeedVote postId={post.id} initialScore={post.score} appearance="inline" />
        </div>
      </article>
    )
  }

  if (mode === "magazine") {
    return (
      <article className={config.wrapper} data-feed-layout={mode}>
        <div className={config.inner}>
          {config.extra?.(post, group)}
          <FeedTitle post={post} titleClassName={config.titleClass} />
          <FeedMeta post={post} className="text-xs" hideAuthor />
          <p className="text-muted-foreground text-xs">Posted by {post.author}</p>
          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
            <FeedActionBar post={post} />
            <FeedVote postId={post.id} initialScore={post.score} appearance="inline" />
          </div>
        </div>
      </article>
    )
  }

  if (mode === "terminal") {
    const { href, isExternal } = usePostLinksInline(post)
    return (
      <article className={config.wrapper} data-feed-layout={mode}>
        {config.extra?.(post, group)}
        <div className="space-y-2 px-3 py-2.5 sm:px-4">
          <p className="leading-snug">
            <span className="text-muted-foreground select-none">{"> "}</span>
            <a
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="text-foreground hover:text-primary transition-colors"
            >
              {post.type === "show" ? (
                <span className="text-primary/80 mr-1">[show]</span>
              ) : null}
              {post.title}
            </a>
          </p>
          <p className={cn("text-muted-foreground", config.metaClass)}>
            score={post.score} · comments={post.commentCount} · user={post.author} · t=
            {post.submittedAt}
          </p>
          <FeedVote postId={post.id} initialScore={post.score} appearance="inline" />
        </div>
      </article>
    )
  }

  if (mode === "stacked") {
    return (
      <article className={config.wrapper} data-feed-layout={mode}>
        {config.extra?.(post, group)}
        <div className={config.inner}>
          <div className="flex items-start justify-between gap-2">
            <FeedDomainPill domain={post.domain} />
            <FeedExternalButton post={post} className={cn("opacity-0", group)} />
          </div>
          <FeedTitle post={post} titleClassName={config.titleClass} />
          <FeedMeta post={post} className="text-xs" />
          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
            <span className="text-muted-foreground text-xs">{post.author}</span>
            <FeedVote postId={post.id} initialScore={post.score} appearance="inline" />
          </div>
        </div>
      </article>
    )
  }

  if (mode === "split") {
    return (
      <article className={config.wrapper} data-feed-layout={mode}>
        <div className={config.inner}>
          <PostBody post={post} group={group} metaClass={config.metaClass} />
          <div className="border-border/80 flex w-[4.5rem] shrink-0 items-stretch border-l">
            <FeedVote
              postId={post.id}
              initialScore={post.score}
              appearance="rail"
              className={cn("w-full self-stretch", config.voteClass)}
            />
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className={config.wrapper} data-feed-layout={mode}>
      {config.extra?.(post, group)}
      <div className={config.inner}>
        {config.showVoteRail !== false ? (
          <FeedVote
            postId={post.id}
            initialScore={post.score}
            appearance={config.vote}
            className={cn(
              "border-border/60 shrink-0 self-stretch rounded-none border-r py-1",
              config.voteClass,
            )}
          />
        ) : null}
        <PostBody
          post={post}
          group={group}
          titleClass={config.titleClass}
          metaClass={config.metaClass}
        />
      </div>
    </article>
  )
}

function usePostLinksInline(post: FeedPost) {
  const isExternal = post.url.startsWith("http")
  const href = isExternal ? `${post.url}?ref=refetch.io` : post.url
  return { isExternal, href }
}

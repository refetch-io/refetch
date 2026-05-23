import { Link } from "@tanstack/react-router"
import { ExternalLink, MessageSquare } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { FeedPost } from "@/lib/feed/types"
import { cn } from "@/lib/utils"

export function cleanDomain(domain: string) {
  return domain.replace(/^www\./, "")
}

export function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`
}

export function domainInitial(domain: string) {
  return cleanDomain(domain).charAt(0).toUpperCase()
}

export function usePostLinks(post: FeedPost) {
  const isExternal = post.url.startsWith("http")
  const href = isExternal ? `${post.url}?ref=refetch.io` : post.url
  return { isExternal, href }
}

export function FeedFavicon({
  domain,
  className,
  wrapperClassName,
}: {
  domain: string
  className?: string
  wrapperClassName?: string
}) {
  return (
    <span
      className={cn(
        "bg-background ring-border/80 inline-flex shrink-0 items-center justify-center rounded-md p-0.5 ring-1",
        wrapperClassName,
      )}
    >
      <Avatar size="sm" className={cn("size-4 rounded-sm after:rounded-sm", className)}>
        <AvatarImage src={faviconUrl(domain)} alt="" className="object-contain p-px" />
        <AvatarFallback className="rounded-sm text-[9px] font-medium">
          {domainInitial(domain)}
        </AvatarFallback>
      </Avatar>
    </span>
  )
}

export function FeedDomainPill({
  domain,
  className,
}: {
  domain: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "bg-muted/60 text-muted-foreground ring-border/60 inline-flex max-w-[12rem] items-center gap-1.5 truncate rounded-full px-2 py-0.5 text-xs ring-1",
        className,
      )}
    >
      <FeedFavicon domain={domain} wrapperClassName="bg-transparent p-0 ring-0" />
      <span className="truncate font-medium">{cleanDomain(domain)}</span>
    </span>
  )
}

export function FeedShowBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn("mr-1.5 align-middle text-[10px] font-medium tracking-wide", className)}
    >
      SHOW
    </Badge>
  )
}

export function FeedTitle({
  post,
  className,
  titleClassName,
}: {
  post: FeedPost
  className?: string
  titleClassName?: string
}) {
  const { isExternal, href } = usePostLinks(post)
  return (
    <h3 className={cn("min-w-0 flex-1 leading-snug", className)}>
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className={cn(
          "text-foreground hover:text-primary font-medium tracking-tight transition-colors",
          titleClassName,
        )}
      >
        {post.type === "show" ? <FeedShowBadge /> : null}
        {post.title}
      </a>
    </h3>
  )
}

export function FeedExternalButton({
  post,
  className,
}: {
  post: FeedPost
  className?: string
}) {
  const { isExternal, href } = usePostLinks(post)
  if (!isExternal) return null
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn("text-muted-foreground size-7", className)}
      asChild
    >
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Open link">
        <ExternalLink className="size-3.5" />
      </a>
    </Button>
  )
}

export function FeedCommentsLink({
  post,
  className,
}: {
  post: FeedPost
  className?: string
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("text-muted-foreground hover:text-foreground h-7 gap-1.5 px-2 text-xs", className)}
      asChild
    >
      <Link to="/threads/$threadId" params={{ threadId: post.id }}>
        <MessageSquare className="size-3.5" />
        {post.commentCount}
      </Link>
    </Button>
  )
}

export function FeedActionBar({
  post,
  className,
}: {
  post: FeedPost
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <FeedCommentsLink post={post} />
    </div>
  )
}

export function FeedMeta({
  post,
  className,
  hideAuthor,
}: {
  post: FeedPost
  className?: string
  hideAuthor?: boolean
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
        <FeedFavicon domain={post.domain} wrapperClassName="size-5 p-0.5" />
        <span className="text-foreground/80 font-medium">{cleanDomain(post.domain)}</span>
      </span>
      <span className="text-border/80">·</span>
      <span>{post.submittedAt}</span>
      {post.readingTimeMinutes ? (
        <>
          <span className="text-border/80 hidden sm:inline">·</span>
          <span className="hidden sm:inline">{post.readingTimeMinutes} min</span>
        </>
      ) : null}
      {!hideAuthor ? (
        <>
          <span className="text-border/80 hidden sm:inline">·</span>
          <span className="hidden sm:inline">{post.author}</span>
        </>
      ) : null}
    </div>
  )
}

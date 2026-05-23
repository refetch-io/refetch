import { getAvatarAppearance } from "@/lib/avatar"
import { cn } from "@/lib/utils"

import { Avatar, AvatarFallback, AvatarImage } from "./avatar"

type RefetchAvatarProps = {
  seed: string
  src?: string | null
  alt?: string
  size?: "default" | "sm" | "lg"
  className?: string
  fallbackClassName?: string
  maxInitials?: number
}

export function RefetchAvatar({
  seed,
  src,
  alt,
  size = "default",
  className,
  fallbackClassName,
  maxInitials,
}: RefetchAvatarProps) {
  const { initials, backgroundColor, color } = getAvatarAppearance(seed, {
    maxInitials,
  })

  return (
    <Avatar size={size} className={className}>
      {src ? <AvatarImage src={src} alt={alt ?? seed} /> : null}
      <AvatarFallback
        className={cn("font-semibold", fallbackClassName)}
        style={{ backgroundColor, color }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

type CommunityAvatarBadgeProps = {
  seed: string
  className?: string
  maxInitials?: number
}

/** Compact circular badge (e.g. community icon in post meta). */
export function CommunityAvatarBadge({
  seed,
  className,
  maxInitials = 1,
}: CommunityAvatarBadgeProps) {
  const { initials, backgroundColor, color } = getAvatarAppearance(seed, {
    maxInitials,
  })

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold",
        className,
      )}
      style={{ backgroundColor, color }}
      aria-hidden
    >
      {initials}
    </span>
  )
}

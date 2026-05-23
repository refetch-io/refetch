import { FeedPostShell } from "@/components/feed/feed-shell"
import type { FeedPost } from "@/lib/feed/types"
import type { FeedDesignVariantId } from "@/lib/feed/variants"

export type FeedPostVariantProps = {
  post: FeedPost
}

function variantComponent(id: FeedDesignVariantId) {
  return function FeedVariant({ post }: FeedPostVariantProps) {
    return <FeedPostShell post={post} mode={id} />
  }
}

export const FeedVariantClassic = variantComponent("classic")
export const FeedVariantMinimal = variantComponent("minimal")
export const FeedVariantGlass = variantComponent("glass")
export const FeedVariantCompact = variantComponent("compact")
export const FeedVariantMagazine = variantComponent("magazine")
export const FeedVariantTimeline = variantComponent("timeline")
export const FeedVariantTerminal = variantComponent("terminal")
export const FeedVariantNeon = variantComponent("neon")
export const FeedVariantSplit = variantComponent("split")
export const FeedVariantStacked = variantComponent("stacked")

const FEED_VARIANT_COMPONENTS = {
  classic: FeedVariantClassic,
  minimal: FeedVariantMinimal,
  glass: FeedVariantGlass,
  compact: FeedVariantCompact,
  magazine: FeedVariantMagazine,
  timeline: FeedVariantTimeline,
  terminal: FeedVariantTerminal,
  neon: FeedVariantNeon,
  split: FeedVariantSplit,
  stacked: FeedVariantStacked,
} as const

export function FeedPostByVariant({
  post,
  variant,
}: FeedPostVariantProps & { variant: FeedDesignVariantId }) {
  const Component = FEED_VARIANT_COMPONENTS[variant]
  return <Component post={post} />
}

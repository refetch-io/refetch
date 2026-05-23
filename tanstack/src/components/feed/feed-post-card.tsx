import { FeedPostByVariant } from "@/components/feed/feed-design-variants"
import { useFeedVariant } from "@/components/feed/feed-variant-context"
import type { FeedPost } from "@/lib/feed/types"

type FeedPostCardProps = {
  post: FeedPost
}

export function FeedPostCard({ post }: FeedPostCardProps) {
  const { variant } = useFeedVariant()
  return <FeedPostByVariant post={post} variant={variant} />
}

export const FeedPostRow = FeedPostCard

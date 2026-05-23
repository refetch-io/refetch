import type { FeedPost, FeedSort } from "@/lib/feed/types"

export function sortFeedPosts(posts: FeedPost[], sort: FeedSort): FeedPost[] {
  const copy = [...posts]

  switch (sort) {
    case "new":
      return copy.sort(
        (a, b) =>
          parseSubmittedHours(a.submittedAt) - parseSubmittedHours(b.submittedAt),
      )
    case "show":
      return copy
        .filter((p) => p.type === "show")
        .sort((a, b) => b.score - a.score)
    case "top":
    default:
      return copy.sort((a, b) => b.score - a.score)
  }
}

function parseSubmittedHours(label: string): number {
  const match = label.match(/(\d+)\s*h/)
  if (match) return Number(match[1])
  const dayMatch = label.match(/(\d+)\s*d/)
  if (dayMatch) return Number(dayMatch[1]) * 24
  return 999
}

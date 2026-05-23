export type FeedSort = "top" | "new" | "show"

export type FeedPost = {
  id: string
  title: string
  url: string
  domain: string
  score: number
  commentCount: number
  author: string
  submittedAt: string
  type?: "story" | "show"
  readingTimeMinutes?: number
}

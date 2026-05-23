export type SocialFeedPost = {
  id: string
  community: string
  author: string
  submittedAt: string
  title: string
  body?: string
  imageGradient?: string
  codeSnippet?: string
  tags?: string[]
  score: number
  commentCount: number
}

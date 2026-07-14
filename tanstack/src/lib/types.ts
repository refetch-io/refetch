export type PostType = 'link' | 'show'
export type ResourceType = 'post' | 'comment'
export type VoteDirection = 'up' | 'down'
export type SortType = 'score' | 'new' | 'show' | 'mines'

export interface Post {
  id: string
  title: string
  description: string
  tldr?: string
  link?: string
  domain: string
  author: string
  userId: string
  count: number
  countUp: number
  countDown: number
  countComments: number
  type: PostType | string
  readingTime?: number
  spamScore?: number
  createdAt: string
  updatedAt: string
  currentVote?: VoteDirection | null
  timeAgo?: string
}

export interface Comment {
  id: string
  postId: string
  author: string
  userId: string
  text: string
  count: number
  countUp: number
  countDown: number
  parentId?: string
  createdAt: string
  timeAgo?: string
  replies?: Comment[]
  currentVote?: VoteDirection | null
}

export interface VoteState {
  currentVote: VoteDirection | null
  count: number
  countUp?: number
  countDown?: number
}

export interface VoteResource {
  id: string
  $id?: string
  resourceId: string
  resourceType: ResourceType
  count: number
  userId: string
}

export interface AccountUser {
  $id: string
  name: string
  email: string
  $createdAt?: string
  emailVerification?: boolean
  prefs?: Record<string, unknown>
}

export interface Paginated<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

export interface ApiErrorBody {
  error: string
  message?: string
  details?: unknown
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsedAt: string | null
}

export interface CreatedApiKey extends ApiKey {
  /** Full secret - returned only once when the key is created. */
  secret: string
}

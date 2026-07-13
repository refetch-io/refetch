import { getCachedJWT, clearCachedJWT } from '../jwt-cache'
import type {
  AccountUser,
  Paginated,
  Post,
  ResourceType,
  SortType,
  VoteDirection,
  VoteState,
  Comment,
} from '../types'

async function authHeaders(init?: HeadersInit): Promise<HeadersInit> {
  const jwt = await getCachedJWT()
  return {
    ...init,
    Authorization: `Bearer ${jwt}`,
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body.error || body.message || message
    } catch {
      // ignore
    }
    if (res.status === 401 && typeof window !== 'undefined') {
      clearCachedJWT()
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  async listPosts(params: {
    sort?: SortType
    limit?: number
    offset?: number
    userId?: string
    since?: string
  }): Promise<Paginated<Post>> {
    const search = new URLSearchParams()
    if (params.sort) search.set('sort', params.sort)
    if (params.limit != null) search.set('limit', String(params.limit))
    if (params.offset != null) search.set('offset', String(params.offset))
    if (params.userId) search.set('userId', params.userId)
    if (params.since) search.set('since', params.since)
    const res = await fetch(`/api/v1/posts?${search}`)
    return parseJson(res)
  },

  async searchPosts(params: {
    q: string
    limit?: number
  }): Promise<Paginated<Post>> {
    const search = new URLSearchParams()
    search.set('q', params.q)
    if (params.limit != null) search.set('limit', String(params.limit))
    const res = await fetch(`/api/v1/posts/search?${search}`)
    return parseJson(res)
  },

  async getPost(postId: string): Promise<Post> {
    const res = await fetch(`/api/v1/posts/${postId}`)
    return parseJson(res)
  },

  async createPost(body: {
    title: string
    url?: string
    description?: string
    type: 'link' | 'show'
  }): Promise<Post> {
    const res = await fetch('/api/v1/posts', {
      method: 'POST',
      headers: await authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
    return parseJson(res)
  },

  async deletePost(postId: string): Promise<void> {
    const res = await fetch(`/api/v1/posts/${postId}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    })
    await parseJson(res)
  },

  async listComments(postId: string): Promise<{ data: Comment[]; total: number }> {
    const res = await fetch(`/api/v1/posts/${postId}/comments`)
    return parseJson(res)
  },

  async createComment(
    postId: string,
    body: { text: string; replyId?: string },
  ): Promise<Comment> {
    const res = await fetch(`/api/v1/posts/${postId}/comments`, {
      method: 'POST',
      headers: await authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
    return parseJson(res)
  },

  async deleteComment(commentId: string): Promise<void> {
    const res = await fetch(`/api/v1/comments/${commentId}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    })
    await parseJson(res)
  },

  async getVote(params: {
    resourceId: string
    resourceType: ResourceType
  }): Promise<VoteState> {
    const search = new URLSearchParams(params)
    const res = await fetch(`/api/v1/votes?${search}`, {
      headers: await authHeaders(),
    })
    return parseJson(res)
  },

  async getVotesBatch(
    resources: Array<{ id: string; type: ResourceType }>,
  ): Promise<Record<string, VoteDirection | null>> {
    const res = await fetch('/api/v1/votes', {
      method: 'POST',
      headers: await authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'batch', resources }),
    })
    const data = await parseJson<{ voteMap: Record<string, VoteDirection | null> }>(
      res,
    )
    return data.voteMap
  },

  async castVote(body: {
    resourceId: string
    resourceType: ResourceType
    voteType: VoteDirection
  }): Promise<VoteState & { operation: string; voteType: VoteDirection | null }> {
    const res = await fetch('/api/v1/votes', {
      method: 'POST',
      headers: await authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
    return parseJson(res)
  },

  async getAccount(): Promise<AccountUser> {
    const res = await fetch('/api/v1/account', {
      headers: await authHeaders(),
    })
    return parseJson(res)
  },

  async updateAccount(body: {
    name?: string
    email?: string
    password?: string
    oldPassword?: string
    newPassword?: string
  }): Promise<AccountUser> {
    const res = await fetch('/api/v1/account', {
      method: 'PATCH',
      headers: await authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
    return parseJson(res)
  },
}

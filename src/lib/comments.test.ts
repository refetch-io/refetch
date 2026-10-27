import { describe, expect, it } from 'vitest'
import type { Comment } from './types'
import { buildCommentTree, countDescendants } from './comments'

function comment(id: string, overrides: Partial<Comment> = {}): Comment {
  return {
    id,
    postId: 'p1',
    userId: 'u1',
    userName: 'Ada',
    content: id,
    replyId: null,
    count: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    editedAt: null,
    vote: null,
    ...overrides,
  }
}

describe('buildCommentTree', () => {
  const comments = [
    comment('a', { createdAt: '2026-01-01T00:00:01.000Z', count: 1 }),
    comment('b', { createdAt: '2026-01-01T00:00:02.000Z', count: 5 }),
    comment('a1', { replyId: 'a', createdAt: '2026-01-01T00:00:04.000Z' }),
    comment('a0', { replyId: 'a', createdAt: '2026-01-01T00:00:03.000Z' }),
    comment('a1x', { replyId: 'a1', createdAt: '2026-01-01T00:00:05.000Z' }),
    comment('orphan', { replyId: 'deleted', createdAt: '2026-01-01T00:00:06.000Z' }),
  ]

  it('nests replies under their parents, oldest reply first, with depths', () => {
    const [a] = buildCommentTree(comments, 'oldest')
    expect(a.id).toBe('a')
    expect(a.children.map((child) => child.id)).toEqual(['a0', 'a1'])
    expect(a.children[1].children[0]).toMatchObject({ id: 'a1x', depth: 2 })
  })

  it('promotes replies whose parent is gone to the top level', () => {
    const roots = buildCommentTree(comments, 'oldest')
    expect(roots.map((root) => root.id)).toEqual(['a', 'b', 'orphan'])
  })

  it('sorts top-level comments by the chosen order', () => {
    expect(buildCommentTree(comments, 'newest').map((root) => root.id)).toEqual(['orphan', 'b', 'a'])
    expect(buildCommentTree(comments, 'top')[0].id).toBe('b')
  })

  it('counts every descendant', () => {
    const [a] = buildCommentTree(comments, 'oldest')
    expect(countDescendants(a)).toBe(3)
  })
})

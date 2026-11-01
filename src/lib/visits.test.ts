import { describe, expect, it } from 'vitest'
import { newCommentCount, newCommentIds, pruneVisits } from './visits'

describe('newCommentIds', () => {
  const comments = [
    { id: 'a', userId: 'u1', createdAt: '2026-11-01T10:00:00.000Z' },
    { id: 'b', userId: 'u2', createdAt: '2026-11-01T12:00:00.000Z' },
    { id: 'c', userId: 'me', createdAt: '2026-11-01T13:00:00.000Z' },
  ]

  it('marks other people’s comments posted since the visit', () => {
    expect([...newCommentIds(comments, new Date('2026-11-01T11:00:00Z').getTime(), 'me')]).toEqual(['b'])
  })

  it('marks nothing on a first visit', () => {
    expect(newCommentIds(comments, null, 'me').size).toBe(0)
  })
})

describe('newCommentCount', () => {
  it('counts comments added since the visit', () => {
    expect(newCommentCount({ at: 1, count: 4 }, 7)).toBe(3)
    expect(newCommentCount({ at: 1, count: 4 }, 2)).toBe(0)
    expect(newCommentCount(null, 7)).toBe(0)
  })
})

describe('pruneVisits', () => {
  it('keeps the most recently opened threads', () => {
    const map = { a: [1, 0], b: [3, 0], c: [2, 0] } as Record<string, [number, number]>
    expect(Object.keys(pruneVisits(map, 2)).sort()).toEqual(['b', 'c'])
    expect(pruneVisits(map, 5)).toBe(map)
  })
})

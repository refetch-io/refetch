import { describe, expect, it } from 'vitest'
import {
  MAX_VOTE_LOOKUP,
  bearerToken,
  commentInput,
  statusForFailure,
  submitInput,
  toAppResponse,
  voteInput,
  voteLookupInput,
} from './app-api'

const JWT = 'eyJhbGciOiJIUzI1NiJ9.payload.signature'

describe('bearerToken', () => {
  it('reads a bearer token', () => {
    expect(bearerToken(`Bearer ${JWT}`)).toBe(JWT)
    expect(bearerToken(`bearer ${JWT}`)).toBe(JWT)
  })

  it('rejects missing, malformed and implausible tokens', () => {
    expect(bearerToken(null)).toBeNull()
    expect(bearerToken('')).toBeNull()
    expect(bearerToken(JWT)).toBeNull()
    expect(bearerToken('Basic abc')).toBeNull()
    expect(bearerToken('Bearer short')).toBeNull()
    expect(bearerToken(`Bearer ${'x'.repeat(5000)}`)).toBeNull()
  })
})

describe('toAppResponse', () => {
  it('wraps success in data', () => {
    expect(toAppResponse({ ok: true, data: { vote: 'up', count: 3 } })).toEqual({
      status: 200,
      body: { data: { vote: 'up', count: 3 } },
    })
  })

  it('maps failure codes onto statuses and keeps existingId', () => {
    expect(
      toAppResponse({ ok: false, code: 'duplicate', error: 'Already shared.', existingId: 'abc' }),
    ).toEqual({ status: 409, body: { error: 'Already shared.', code: 'duplicate', existingId: 'abc' } })
    expect(toAppResponse({ ok: false, error: 'Nope.' })).toEqual({ status: 400, body: { error: 'Nope.' } })
  })

  it('uses 401 and 429 for auth and rate limits', () => {
    expect(statusForFailure('unauthorized')).toBe(401)
    expect(statusForFailure('rate_limited')).toBe(429)
  })
})

describe('inputs', () => {
  it('validates votes', () => {
    expect(voteInput.safeParse({ resourceType: 'post', resourceId: 'abc', direction: 'up' }).success).toBe(
      true,
    )
    expect(voteInput.safeParse({ resourceType: 'user', resourceId: 'abc', direction: 'up' }).success).toBe(
      false,
    )
    expect(voteInput.safeParse({ resourceType: 'post', resourceId: '../x', direction: 'up' }).success).toBe(
      false,
    )
  })

  it('defaults and caps vote lookups', () => {
    expect(voteLookupInput.parse({})).toEqual({ posts: [], comments: [] })
    const tooMany = Array.from({ length: MAX_VOTE_LOOKUP + 1 }, (_, i) => `p${i}`)
    expect(voteLookupInput.safeParse({ posts: tooMany }).success).toBe(false)
  })

  it('trims comments and rejects empty ones', () => {
    expect(commentInput.parse({ postId: 'abc', content: '  hi  ' }).content).toBe('hi')
    expect(commentInput.safeParse({ postId: 'abc', content: '   ' }).success).toBe(false)
  })

  it('requires an http(s) url to submit', () => {
    expect(submitInput.safeParse({ title: 'T', url: 'https://example.com' }).success).toBe(true)
    expect(submitInput.safeParse({ title: 'T', url: 'javascript:alert(1)' }).success).toBe(false)
    expect(submitInput.safeParse({ title: ' ', url: 'https://example.com' }).success).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { crossedMilestone, excerpt, notificationHref, notificationSentence } from './notifications'

describe('crossedMilestone', () => {
  it('reports the milestone a score passes going up', () => {
    expect(crossedMilestone(9, 10)).toBe(10)
    expect(crossedMilestone(24, 26)).toBe(25)
  })

  it('reports the highest milestone when several are crossed at once', () => {
    expect(crossedMilestone(8, 60)).toBe(50)
  })

  it('ignores scores going down or staying between milestones', () => {
    expect(crossedMilestone(10, 9)).toBeNull()
    expect(crossedMilestone(11, 12)).toBeNull()
    expect(crossedMilestone(10, 10)).toBeNull()
  })
})

describe('notificationSentence', () => {
  const actor = { id: 'u2', name: 'Grace' }

  it('describes each kind of notification', () => {
    expect(notificationSentence({ type: 'reply', actor, postTitle: 'Rust 2', preview: '' })).toBe(
      'Grace replied to your comment on “Rust 2”',
    )
    expect(notificationSentence({ type: 'comment', actor, postTitle: 'Rust 2', preview: '' })).toBe(
      'Grace commented on “Rust 2”',
    )
    expect(notificationSentence({ type: 'follow', actor, postTitle: null, preview: '' })).toBe(
      'Grace started following you',
    )
    expect(notificationSentence({ type: 'milestone', actor: null, postTitle: 'Rust 2', preview: '50' })).toBe(
      'Your story reached 50 points: “Rust 2”',
    )
  })
})

describe('notificationHref', () => {
  it('links follows to the follower and the rest to the comment in its thread', () => {
    expect(
      notificationHref({ type: 'follow', actor: { id: 'u2', name: 'G' }, postId: null, commentId: null }),
    ).toBe('/users/u2')
    expect(notificationHref({ type: 'reply', actor: null, postId: 'p1', commentId: 'c9' })).toBe(
      '/threads/p1#comment-c9',
    )
    expect(notificationHref({ type: 'milestone', actor: null, postId: 'p1', commentId: null })).toBe(
      '/threads/p1',
    )
  })
})

describe('excerpt', () => {
  it('collapses whitespace and trims long text with an ellipsis', () => {
    expect(excerpt('  hello \n\n world  ')).toBe('hello world')
    const long = excerpt('a'.repeat(300), 10)
    expect(long).toHaveLength(10)
    expect(long.endsWith('…')).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { nextVoteState } from './vote-store'

describe('nextVoteState', () => {
  it('casts, removes and flips votes like the server', () => {
    expect(nextVoteState({ vote: null, count: 4 }, 'up')).toEqual({ vote: 'up', count: 5 })
    expect(nextVoteState({ vote: 'up', count: 5 }, 'up')).toEqual({ vote: null, count: 4 })
    expect(nextVoteState({ vote: 'up', count: 5 }, 'down')).toEqual({ vote: 'down', count: 3 })
    expect(nextVoteState({ vote: 'down', count: 3 }, 'down')).toEqual({ vote: null, count: 4 })
  })
})

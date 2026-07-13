import type { VoteDirection, VoteState } from './types'

export function calculateOptimisticVoteState(
  currentVote: VoteDirection | null,
  direction: VoteDirection,
  currentScore: number,
): VoteState {
  if (currentVote === direction) {
    return {
      currentVote: null,
      count: direction === 'up' ? currentScore - 1 : currentScore + 1,
    }
  }
  if (currentVote === null) {
    return {
      currentVote: direction,
      count: direction === 'up' ? currentScore + 1 : currentScore - 1,
    }
  }
  return {
    currentVote: direction,
    count: direction === 'up' ? currentScore + 2 : currentScore - 2,
  }
}

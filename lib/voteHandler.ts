import { getCachedJWT } from './jwtCache'
import type { VoteState, VoteRequest } from './types'

export const fetchUserVote = async (
  resourceId: string, 
  resourceType: 'post' | 'comment'
): Promise<VoteState | null> => {
  try {
    // Get JWT token for authentication
    const jwt = await getCachedJWT()

    if (!jwt) {
      console.error('No JWT token available')
      return null
    }

    // Fetch the user's current vote for this resource
    const response = await fetch(`/api/vote/state?resourceId=${resourceId}&resourceType=${resourceType}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      return data
    } else {
      console.error('Failed to fetch vote state:', response.status)
      return null
    }
  } catch (error) {
    console.error('Error fetching vote state:', error)
    return null
  }
}

export const handleVote = async (
  resourceId: string,
  resourceType: 'post' | 'comment',
  direction: "up" | "down", 
  currentVote: 'up' | 'down' | null,
  currentScore: number,
  onVoteUpdate?: (newState: VoteState) => void
) => {
  try {
    // Get JWT token for authentication
    const jwt = await getCachedJWT()

    if (!jwt) {
      console.error('No JWT token available')
      return
    }

    // Optimistic update - update the UI immediately
    if (onVoteUpdate) {
      let newScore: number
      let newVote: 'up' | 'down' | null

      console.log('=== VOTE DEBUG ===')
      console.log('Current state:', {
        currentVote,
        direction,
        currentScore,
        resourceId,
        resourceType
      })

      if (currentVote === direction) {
        // Removing vote - clicking the same vote type
        newScore = currentScore - (direction === "up" ? 1 : -1)
        newVote = null
        console.log('Removing vote - new score:', newScore, 'new vote:', newVote)
      } else if (currentVote === null) {
        // New vote - add to current score
        newScore = currentScore + (direction === "up" ? 1 : -1)
        newVote = direction
        console.log('New vote - new score:', newScore, 'new vote:', newVote)
      } else {
        // Changing vote - remove previous vote and add new vote
        const previousVoteValue = currentVote === 'up' ? 1 : -1
        const newVoteValue = direction === 'up' ? 1 : -1
        newScore = currentScore - previousVoteValue + newVoteValue
        newVote = direction
        console.log('Changing vote:', {
          previousVote: currentVote,
          newVote: direction,
          previousValue: previousVoteValue,
          newValue: newVoteValue,
          scoreChange: -previousVoteValue + newVoteValue,
          newScore
        })
      }

      onVoteUpdate({
        currentVote: newVote,
        score: newScore
      })
      console.log('=== END VOTE DEBUG ===')
    }

    // Make the API call to the vote endpoint
    const response = await fetch('/api/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        resourceId,
        resourceType,
        voteType: direction
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Vote failed:', errorData.message)
      // Revert optimistic update on error
      if (onVoteUpdate) {
        // Revert to previous state
        onVoteUpdate({
          currentVote: currentVote,
          score: currentScore
        })
      }
      return
    }

    const result = await response.json()
    console.log(`Vote ${direction} for ${resourceType} ${resourceId}:`, result.message)
    
    return result

  } catch (error) {
    console.error('Error voting:', error)
    // Revert optimistic update on error
    if (onVoteUpdate) {
      onVoteUpdate({
        currentVote: currentVote,
        score: currentScore
      })
    }
  }
}

// Helper function to fetch votes for multiple resources
export const fetchUserVotesForResources = async (
  resources: Array<{ id: string; type: 'post' | 'comment' }>
): Promise<Map<string, VoteState>> => {
  try {
    const jwt = await getCachedJWT()
    if (!jwt) {
      console.error('No JWT token available')
      return new Map()
    }

    // Fetch votes for all resources in parallel
    const votePromises = resources.map(async (resource) => {
      const voteState = await fetchUserVote(resource.id, resource.type)
      return { id: resource.id, voteState }
    })

    const results = await Promise.all(votePromises)
    const voteMap = new Map<string, VoteState>()

    results.forEach(({ id, voteState }) => {
      if (voteState) {
        voteMap.set(id, voteState)
      }
    })

    return voteMap
  } catch (error) {
    console.error('Error fetching user votes for resources:', error)
    return new Map()
  }
}

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
        count: newScore
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
          count: currentScore
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
        count: currentScore
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

    if (resources.length === 0) {
      return new Map()
    }

    // Make a single POST API call instead of individual calls
    // Using POST to avoid URL length issues with many resource IDs
    const response = await fetch('/api/vote/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({ resources })
    })

    if (!response.ok) {
      console.error('Failed to fetch batch vote states:', response.status)
      // Fallback to individual fetching if batch fails
      return await fetchUserVotesForResourcesFallback(resources)
    }

    const data = await response.json()
    const voteMap = new Map<string, VoteState>()

    // Convert the response to the expected format
    Object.entries(data.voteMap).forEach(([resourceId, voteData]: [string, any]) => {
      voteMap.set(resourceId, {
        currentVote: voteData.currentVote,
        count: voteData.count,
        countUp: voteData.countUp,
        countDown: voteData.countDown
      })
    })

    return voteMap
  } catch (error) {
    console.error('Error fetching user votes for resources:', error)
    // Fallback to individual fetching if batch fails
    return await fetchUserVotesForResourcesFallback(resources)
  }
}

// Fallback function to fetch votes individually if batch fails
async function fetchUserVotesForResourcesFallback(
  resources: Array<{ id: string; type: 'post' | 'comment' }>
): Promise<Map<string, VoteState>> {
  console.log('Falling back to individual vote fetching for', resources.length, 'resources')
  
  const voteMap = new Map<string, VoteState>()
  
  // Fetch votes for each resource individually as fallback
  for (const resource of resources) {
    try {
      const voteState = await fetchUserVote(resource.id, resource.type)
      if (voteState) {
        voteMap.set(resource.id, voteState)
      }
    } catch (error) {
      console.error(`Error fetching vote for ${resource.type} ${resource.id}:`, error)
    }
  }
  
  return voteMap
}

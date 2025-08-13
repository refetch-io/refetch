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

export function handleVote(
  currentVote: 'up' | 'down' | null,
  newVoteType: 'up' | 'down',
  currentScore: number
): { newScore: number; newVote: 'up' | 'down' | null } {
  let newScore = currentScore
  let newVote: 'up' | 'down' | null = currentVote

  if (currentVote === newVoteType) {
    // Remove vote (same vote type clicked again)
    newVote = null
    newScore = currentVote === 'up' ? currentScore - 1 : currentScore + 1
  } else if (currentVote === null) {
    // New vote
    newVote = newVoteType
    newScore = newVoteType === 'up' ? currentScore + 1 : currentScore - 1
  } else {
    // Change vote
    newVote = newVoteType
    if (currentVote === 'up' && newVoteType === 'down') {
      newScore = currentScore - 2 // From +1 to -1 = -2
    } else if (currentVote === 'down' && newVoteType === 'up') {
      newScore = currentScore + 2 // From -1 to +1 = +2
    }
  }

  return { newScore, newVote }
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

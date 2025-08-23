import { getCachedJWT } from './jwtCache'
import { account } from './appwrite'
import type { VoteState, VoteRequest } from './types'

// Helper function to handle authentication failure
const handleAuthenticationFailure = (error: any): void => {
  console.error('🔐 Authentication completely failed:', error)
  
  if (typeof window !== 'undefined') {
    // Clear any cached JWT
    localStorage.removeItem('refetch_jwt_cache')
    
    // Redirect to login
    console.log('🔄 Redirecting to login page...')
            window.location.href = '/signin'
  }
}

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

// Main async function to handle voting - makes the API call
export const handleVote = async (
  resourceId: string,
  resourceType: 'post' | 'comment',
  direction: 'up' | 'down',
  currentVote: 'up' | 'down' | null,
  currentScore: number,
  onVoteStateChange: (newState: VoteState) => void
): Promise<void> => {
  try {
    console.log('🚀 Starting vote process for:', resourceType, resourceId, direction)
    
    // Get JWT token for authentication
    const jwt = await getCachedJWT()

    if (!jwt) {
      throw new Error('No JWT token available')
    }

    console.log('🔑 JWT token obtained, making API call...')

    // Make API call to record the vote
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
      const errorText = await response.text()
      
      // Handle specific error cases
      if (response.status === 401) {
        // Clear the cached JWT and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('refetch_jwt_cache')
          window.location.href = '/signin'
        }
        throw new Error('Authentication expired. Please log in again.')
      }
      
      throw new Error(`Vote failed: ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()
    console.log('✅ Vote successful:', responseData)

    // Calculate new vote state based on the response
    const newVoteState = calculateVoteState(currentVote, direction, currentScore)
    
    // Call the callback to update the parent component's state
    onVoteStateChange(newVoteState)

  } catch (error) {
    console.error('❌ Error handling vote:', error)
    
    // If it's an authentication error, handle it gracefully
    if (error instanceof Error && error.message.includes('not authenticated')) {
      handleAuthenticationFailure(error)
      return // Don't throw the error, just redirect
    }
    
    // For other errors, re-throw them
    throw error
  }
}

// Helper function to calculate vote state changes (renamed from handleVote to avoid conflict)
export function calculateVoteState(
  currentVote: 'up' | 'down' | null,
  newVoteType: 'up' | 'down',
  currentScore: number
): VoteState {
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

  return { count: newScore, currentVote: newVote }
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

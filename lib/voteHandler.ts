import { account } from './appwrite'

export interface VoteState {
  currentVote: 'up' | 'down' | null
  score: number
}

export const fetchUserVote = async (postId: string): Promise<VoteState | null> => {
  try {
    // Get JWT token for authentication
    const jwtResponse = await account.createJWT()
    const jwt = jwtResponse.jwt

    if (!jwt) {
      console.error('No JWT token available')
      return null
    }

    // Fetch the user's current vote for this post
    const response = await fetch(`/api/vote/state?postId=${postId}`, {
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
  postId: string, 
  direction: "up" | "down", 
  currentVote: 'up' | 'down' | null,
  currentScore: number,
  onVoteUpdate?: (newState: VoteState) => void
) => {
  try {
    // Prevent voting if user already voted the same way
    if (currentVote === direction) {
      console.log('User already voted this way')
      return
    }

    // Get JWT token for authentication
    const jwtResponse = await account.createJWT()
    const jwt = jwtResponse.jwt

    if (!jwt) {
      console.error('No JWT token available')
      return
    }

    // Optimistic update - update the UI immediately
    if (onVoteUpdate) {
      let newScore: number
      let newVote: 'up' | 'down' | null

      if (currentVote === null) {
        // New vote - add to current score
        newScore = currentScore + (direction === "up" ? 1 : -1)
        newVote = direction
      } else {
        // Changing vote - remove previous vote and add new vote
        const previousVoteValue = currentVote === 'up' ? 1 : -1
        const newVoteValue = direction === 'up' ? 1 : -1
        newScore = currentScore - previousVoteValue + newVoteValue
        newVote = direction
      }

      onVoteUpdate({
        currentVote: newVote,
        score: newScore
      })
    }

    // Make the API call to the vote endpoint
    const response = await fetch('/api/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        postId,
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
    console.log(`Vote ${direction} for item ${postId}:`, result.message)
    
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

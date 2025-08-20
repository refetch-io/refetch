export async function deleteComment(commentId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Get JWT token from cache
    const { getCachedJWT } = await import('@/lib/jwtCache')
    const jwt = await getCachedJWT()

    if (!jwt) {
      return {
        success: false,
        error: 'Authentication token not found'
      }
    }

    const response = await fetch(`/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    })

    const data = await response.json()

    if (response.ok) {
      return {
        success: true,
        message: data.message || 'Comment deleted successfully'
      }
    } else {
      return {
        success: false,
        error: data.error || 'Failed to delete comment'
      }
    }
  } catch (error) {
    console.error('Error deleting comment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete comment'
    }
  }
}

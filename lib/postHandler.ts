import { getCachedJWT } from './jwtCache'

export async function deletePost(postId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Get the JWT token from cache
    const jwt = await getCachedJWT()
    
    if (!jwt) {
      console.log('🔑 No JWT token found, redirecting to login...')
      // Redirect to login page
              window.location.href = '/signin'
      return { success: false, error: 'No authentication token' }
    }

    console.log('🔑 JWT token obtained, making delete API call...')

    // Make the delete request
    const response = await fetch(`/api/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete post')
    }

    console.log('✅ Post deleted successfully')
    return { success: true, message: data.message }

  } catch (error) {
    console.error('❌ Error deleting post:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete post' 
    }
  }
}

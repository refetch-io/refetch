import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, Query } from 'node-appwrite'

// Initialize Appwrite client for server-side operations
const apiKeyClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '')

const databases = new Databases(apiKeyClient)

// Helper function to calculate time ago
function getTimeAgo(createdAt: string): string {
  const now = new Date()
  const created = new Date(createdAt)
  const diffInMs = now.getTime() - created.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) return 'today'
  if (diffInDays === 1) return 'yesterday'
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
  return `${Math.floor(diffInDays / 365)} years ago`
}

export async function POST(request: NextRequest) {
  try {
    // Get post IDs from request body instead of query parameters
    const body = await request.json()
    const { postIds } = body

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json({ message: 'Post IDs array is required' }, { status: 400 })
    }

    // Fetch comments for all posts in a single query
    const comments = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_COMMENTS_COLLECTION_ID!,
      [
        Query.equal('postId', postIds), // This will match any of the post IDs
        Query.orderDesc('$createdAt'),
        Query.limit(1000), // Increase limit to get more comments
        // Select only the attributes we actually use to improve performance
        Query.select([
          '$id',
          'postId',
          'userName',
          'content',
          'userId',
          'count',
          '$createdAt'
        ])
      ]
    )

    // Group comments by postId
    const commentsByPost: Record<string, any[]> = {}
    postIds.forEach(postId => {
      commentsByPost[postId] = []
    })

    // Transform and group the comments
    comments.documents.forEach(doc => {
      const postId = doc.postId
      if (commentsByPost[postId]) {
        const transformedComment = {
          id: doc.$id,
          author: doc.userName || 'Anonymous',
          text: doc.content || '',
          timeAgo: getTimeAgo(doc.$createdAt),
          count: doc.count || 0, // Use the count field if available
          userId: doc.userId || '', // Include userId for original poster detection
          replies: [] // TODO: Implement nested replies using replyId
        }
        commentsByPost[postId].push(transformedComment)
      }
    })

    return NextResponse.json({ 
      commentsByPost 
    })

  } catch (error) {
    console.error('Error fetching batch comments:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

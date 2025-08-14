import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, Query, Account } from 'node-appwrite'
import { convertAppwritePostToNewsItem, Comment as AppComment } from '@/lib/data'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id
  
  try {
    // Validate environment variables
    const envCheck = {
      databaseId: !!process.env.APPWRITE_DATABASE_ID,
      postsCollectionId: !!process.env.APPWRITE_POSTS_COLLECTION_ID,
      commentsCollectionId: !!process.env.APPWRITE_COMMENTS_COLLECTION_ID,
      endpoint: !!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
      projectId: !!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
      apiKey: !!process.env.APPWRITE_API_KEY
    }

    if (!envCheck.databaseId || !envCheck.postsCollectionId || !envCheck.endpoint || !envCheck.projectId || !envCheck.apiKey) {
      console.error('Missing required environment variables:', envCheck)
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Initialize Appwrite client
    const { Client, Databases } = await import('node-appwrite')
    
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!)

    const databases = new Databases(client)

    // Fetch the post from the database
    const post = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_POSTS_COLLECTION_ID!,
      id
    )

    // Convert the post to NewsItem format
    const newsItem = convertAppwritePostToNewsItem(post as any, 0)

    // Fetch comments if comments collection is configured
    let comments: AppComment[] = []
    if (process.env.APPWRITE_COMMENTS_COLLECTION_ID) {
      try {
        const commentsResult = await databases.listDocuments(
          process.env.APPWRITE_DATABASE_ID!,
          process.env.APPWRITE_COMMENTS_COLLECTION_ID!,
          [
            Query.equal('postId', id),
            Query.orderDesc('$createdAt'),
            Query.limit(100) // Limit to prevent too many comments
          ]
        )

                 // Transform the comments to match the Comment interface
         comments = commentsResult.documents.map((comment: any) => ({
           id: comment.$id,
           text: comment.text,
           author: comment.author || 'Anonymous',
           timeAgo: getTimeAgo(comment.$createdAt),
           count: comment.count || 0,
           userId: comment.userId
         }))

        // Update the comment count on the post
        newsItem.countComments = comments.length
      } catch (error) {
        console.error('Error fetching comments:', error)
        // Continue without comments if there's an error
      }
    } else {
      // No comments collection configured, set empty array
      newsItem.countComments = 0
    }

    // Return the NewsItem with comments
    return NextResponse.json({
      post: newsItem,
      comments: comments
    })

  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id
  
  try {
    // Validate environment variables
    const envCheck = {
      databaseId: !!process.env.APPWRITE_DATABASE_ID,
      postsCollectionId: !!process.env.APPWRITE_POSTS_COLLECTION_ID,
      endpoint: !!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
      projectId: !!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
      apiKey: !!process.env.APPWRITE_API_KEY
    }

    if (!envCheck.databaseId || !envCheck.postsCollectionId || !envCheck.endpoint || !envCheck.projectId || !envCheck.apiKey) {
      console.error('Missing required environment variables:', envCheck)
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Initialize Appwrite clients
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!)

    const jwtClient = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)

    const databases = new Databases(client)
    const account = new Account(jwtClient)

    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const jwt = authHeader.substring(7)
    
    // Verify JWT and get user
    let user
    try {
      jwtClient.setJWT(jwt)
      user = await account.get()
    } catch (error) {
      console.error('Error verifying JWT:', error)
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Get the post to check ownership
    const post = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_POSTS_COLLECTION_ID!,
      id
    )

    // Check if the user owns this post
    if (post.userId !== user.$id) {
      return NextResponse.json(
        { error: 'You can only delete your own posts' },
        { status: 403 }
      )
    }

    // Delete the post
    await databases.deleteDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_POSTS_COLLECTION_ID!,
      id
    )

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}

// Helper function to format time ago
function getTimeAgo(createdAt: string): string {
  const now = new Date()
  const created = new Date(createdAt)
  const diffInMs = now.getTime() - created.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) {
    return 'today'
  } else if (diffInDays === 1) {
    return '1 day ago'
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30)
    return `${months} month${months > 1 ? 's' : ''} ago`
  } else {
    const years = Math.floor(diffInDays / 365)
    return `${years} year${years > 1 ? 's' : ''} ago`
  }
}

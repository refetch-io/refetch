import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, Query } from 'node-appwrite'
import { convertAppwritePostToNewsItem } from '@/lib/data'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log(`API: Fetching post with ID: ${id}`)

    // Check if required environment variables are set
    const envCheck = {
      endpoint: !!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
      projectId: !!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
      apiKey: !!process.env.APPWRITE_API_KEY,
      databaseId: !!process.env.APPWRITE_DATABASE_ID,
      postsCollectionId: !!process.env.APPWRITE_POSTS_COLLECTION_ID,
      commentsCollectionId: !!process.env.APPWRITE_COMMENTS_COLLECTION_ID
    }
    
    console.log('Environment variables check:', envCheck)
    
    if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 
        !process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 
        !process.env.APPWRITE_API_KEY ||
        !process.env.APPWRITE_DATABASE_ID ||
        !process.env.APPWRITE_POSTS_COLLECTION_ID) {
      console.error('Missing required environment variables')
      return NextResponse.json(
        { error: 'Server configuration error', envCheck },
        { status: 500 }
      )
    }

    // Initialize Appwrite client for server-side operations
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY)

    const databases = new Databases(client)
    console.log('Appwrite client initialized successfully')
    
    // Fetch the post
    console.log(`Fetching post from database: ${process.env.APPWRITE_DATABASE_ID}, collection: ${process.env.APPWRITE_POSTS_COLLECTION_ID}`)
    const post = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_POSTS_COLLECTION_ID,
      id
    )
    console.log('Post fetched successfully:', { id: post.$id, title: post.title })

    // Convert to NewsItem format
    const newsItem = convertAppwritePostToNewsItem(post as any, 0)
    console.log('Post converted to NewsItem format')

    // Fetch comments for this post if comments collection is configured
    if (process.env.APPWRITE_COMMENTS_COLLECTION_ID) {
      try {
        console.log('Fetching comments from collection:', process.env.APPWRITE_COMMENTS_COLLECTION_ID)
        const comments = await databases.listDocuments(
          process.env.APPWRITE_DATABASE_ID,
          process.env.APPWRITE_COMMENTS_COLLECTION_ID,
          [
            Query.equal('postId', id),
            // Select only the attributes we actually use to improve performance
            Query.select([
              '$id',
              'userName',
              'userId',
              'content',
              'count',
              '$createdAt'
            ])
          ]
        )

        // Convert comments to the expected format
        const formattedComments = comments.documents.map((comment: any) => ({
          id: comment.$id,
          author: comment.authorName || 'Anonymous',
          text: comment.text,
          timeAgo: getTimeAgo(comment.createdAt || comment.$createdAt),
          count: comment.count || 0,
          replies: [] // For now, no nested replies
        }))

        newsItem.comments = formattedComments
        console.log(`Fetched ${formattedComments.length} comments`)
      } catch (commentError) {
        console.warn('Could not fetch comments:', commentError)
        newsItem.comments = []
      }
    } else {
      console.log('No comments collection configured, setting empty comments array')
      newsItem.comments = []
    }

    console.log('Returning NewsItem with comments:', { 
      id: newsItem.id, 
      title: newsItem.title, 
      commentsCount: newsItem.comments.length 
    })
    return NextResponse.json(newsItem)
  } catch (error) {
    console.error(`Error fetching post ${params}:`, error)
    
    // Check if it's a 404 error (document not found)
    if (error instanceof Error && error.message.includes('Document with the requested ID could not be found')) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
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

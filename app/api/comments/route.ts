import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, Account, ID, Query } from 'node-appwrite'

// Initialize Appwrite clients for server-side operations
// First client for API key operations (database operations)
const apiKeyClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '')

// Second client for JWT operations (user validation)
const jwtClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')

const databases = new Databases(apiKeyClient)
const account = new Account(jwtClient)

export async function GET(request: NextRequest) {
  try {
    // Get the postId from query parameters
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json({ message: 'Post ID is required' }, { status: 400 })
    }

    // Fetch comments for the specific post
    const comments = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_COMMENTS_COLLECTION_ID!,
      [
        Query.equal('postId', postId),
        Query.orderDesc('$createdAt')
      ]
    )

    // Transform the comments to match the Comment interface
    const transformedComments = comments.documents.map(doc => ({
      id: doc.$id,
      author: doc.userName || 'Anonymous',
      text: doc.content || '',
      timeAgo: getTimeAgo(doc.$createdAt),
      score: 0, // Default score since it's not stored in the collection
      replies: [] // TODO: Implement nested replies using replyId
    }))

    return NextResponse.json({ 
      comments: transformedComments 
    })

  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Parse the request body first (can only be done once)
    const body = await request.json()
    const { postId, text, userName } = body

    // Step 2: Get and validate JWT token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const jwt = authHeader.replace('Bearer ', '')

    // Use the JWT client to validate the token
    const jwtAccount = new Account(jwtClient)
    let user
    try {
      console.log('Received JWT:', jwt)
      // Set the JWT on the client and get user information
      jwtClient.setJWT(jwt)
      user = await jwtAccount.get()
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid or expired JWT token' },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!postId || !text || !text.trim()) {
      return NextResponse.json({ message: 'Post ID and comment text are required' }, { status: 400 })
    }

    // Additional validation - ensure user ID exists
    if (!user.$id) {
      console.error('User ID missing from JWT token')
      return NextResponse.json({ message: 'Invalid user information' }, { status: 401 })
    }

    console.log('Creating comment for user:', { userId: user.$id, userName: userName || user.name, postId })

    // Create the comment in the database using the server-side client
    const comment = await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_COMMENTS_COLLECTION_ID!,
      ID.unique(),
      {
        postId,
        userId: user.$id,
        userName: userName || user.name || 'Anonymous',
        content: text.trim(),
        replyId: '', // Optional field for future nested replies
        countReports: 0 // Optional field with default value
      }
    )

    // Atomically increase the comment count on the post
    try {
      await databases.incrementDocumentAttribute(
        process.env.APPWRITE_DATABASE_ID!,
        process.env.APPWRITE_POSTS_COLLECTION_ID!,
        postId,
        'countComments',
        1, // increment by 1
        undefined // no maximum limit
      )
      console.log('Successfully incremented comment count for post:', postId)
    } catch (updateError) {
      console.error('Error updating comment count for post:', postId, updateError)
      // Don't fail the comment creation if the count update fails
      // The comment was created successfully, just the count couldn't be updated
    }

    console.log('Comment created successfully:', { commentId: comment.$id, postId, authorId: user.$id })

    return NextResponse.json({ 
      message: 'Comment posted successfully',
      commentId: comment.$id 
    })

  } catch (error) {
    console.error('Error posting comment:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to calculate time ago
function getTimeAgo(createdAt: string): string {
  const now = new Date()
  const commentDate = new Date(createdAt)
  const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000)

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`
  return `${Math.floor(diffInSeconds / 31536000)} years ago`
}

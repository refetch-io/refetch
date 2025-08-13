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

// Database and collection IDs
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || ''
const COMMENTS_COLLECTION_ID = process.env.APPWRITE_COMMENTS_COLLECTION_ID || ''

// Abuse protection constants for comments
const MAX_COMMENTS_PER_HOUR = 50
const COMMENT_WINDOW_HOURS = 1

// Comment fetching constants
const MAX_COMMENTS_PER_POST = 500

// Helper function to check user comment count in the last hour
async function checkUserCommentLimit(userId: string): Promise<{ allowed: boolean; count: number; limit: number }> {
  try {
    // Calculate the timestamp for 1 hour ago
    const oneHourAgo = new Date(Date.now() - (COMMENT_WINDOW_HOURS * 60 * 60 * 1000))
    
    console.log(`Checking comments for user ${userId} since ${oneHourAgo.toISOString()}`)
    
    // Query for comments created by this user in the last hour
    const recentComments = await databases.listDocuments(
      DATABASE_ID,
      COMMENTS_COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.greaterThan('$createdAt', oneHourAgo.toISOString()),
        Query.limit(MAX_COMMENTS_PER_HOUR+1)
      ]
    )
    
    const commentCount = recentComments.documents.length
    const allowed = commentCount < MAX_COMMENTS_PER_HOUR
    
    console.log(`Found ${commentCount} comments for user ${userId} in last ${COMMENT_WINDOW_HOURS} hour(s)`)
    
    return {
      allowed,
      count: commentCount,
      limit: MAX_COMMENTS_PER_HOUR
    }
  } catch (error) {
    console.error('Error checking user comment limit:', error)
    // If we can't check the limit, allow the comment to avoid blocking legitimate users
    return { allowed: true, count: 0, limit: MAX_COMMENTS_PER_HOUR }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the postId from query parameters
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json({ message: 'Post ID is required' }, { status: 400 })
    }

    // Fetch comments for the specific post (up to 500 comments)
    const comments = await databases.listDocuments(
      DATABASE_ID,
      COMMENTS_COLLECTION_ID,
      [
        Query.equal('postId', postId),
        Query.orderDesc('$createdAt'),
        Query.limit(MAX_COMMENTS_PER_POST),
        // Select only the attributes we actually use to improve performance
        Query.select([
          '$id',
          'userName',
          'content',
          'userId',
          'count',
          '$createdAt'
        ])
      ]
    )

    console.log(`Fetched ${comments.documents.length} comments for post ${postId} (max limit: ${MAX_COMMENTS_PER_POST})`)

    // Transform the comments to match the Comment interface
    const transformedComments = comments.documents.map(doc => ({
      id: doc.$id,
      author: doc.userName || 'Anonymous',
      text: doc.content || '',
      timeAgo: getTimeAgo(doc.$createdAt),
      count: doc.count || 0, // Use the count field if available
      userId: doc.userId || '', // Include userId for original poster detection
      replies: [] // TODO: Implement nested replies using replyId
    }))

    return NextResponse.json({ 
      comments: transformedComments,
      metadata: {
        totalComments: transformedComments.length,
        maxCommentsPerRequest: MAX_COMMENTS_PER_POST,
        postId: postId
      }
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

    // Step 3: Check user comment limit (abuse protection)
    const commentLimitCheck = await checkUserCommentLimit(user.$id)
    console.log(`User ${user.$id} comment check: ${commentLimitCheck.count}/${commentLimitCheck.limit} in last ${COMMENT_WINDOW_HOURS} hour(s)`)
    
    if (!commentLimitCheck.allowed) {
      console.log(`User ${user.$id} exceeded comment limit: ${commentLimitCheck.count}/${commentLimitCheck.limit}`)
      return NextResponse.json(
        { 
          message: `Comment limit exceeded. You can only post ${commentLimitCheck.limit} comments in a ${COMMENT_WINDOW_HOURS}-hour period. You have posted ${commentLimitCheck.count} comments in the last ${COMMENT_WINDOW_HOURS} hour(s).`,
          limit: commentLimitCheck.limit,
          currentCount: commentLimitCheck.count,
          windowHours: COMMENT_WINDOW_HOURS
        },
        { status: 429 }
      )
    }

    console.log('Creating comment for user:', { userId: user.$id, userName: userName || user.name, postId })

    // Step 4: Create the comment in the database using the server-side client
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

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

    // Fetch all comments for the specific post (up to 500 comments)
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
          'replyId', // Include replyId for nested comments
          '$createdAt'
        ])
      ]
    )

    // Transform the comments to match the Comment interface
    const flatComments = comments.documents.map(doc => ({
      id: doc.$id,
      author: doc.userName || 'Anonymous',
      text: doc.content || '',
      timeAgo: getTimeAgo(doc.$createdAt),
      count: doc.count || 0,
      userId: doc.userId || '',
      parentId: doc.replyId || undefined, // Use replyId as parentId
      replies: [],
      depth: 0
    }))

    // Build nested comment structure
    const nestedComments = buildNestedComments(flatComments)

    return NextResponse.json({ 
      comments: nestedComments,
      metadata: {
        totalComments: flatComments.length,
        maxCommentsPerRequest: MAX_COMMENTS_PER_POST,
        postId: postId
      }
    })

  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to build nested comment structure
function buildNestedComments(flatComments: any[]): any[] {
  const commentMap = new Map()
  const rootComments: any[] = []

  // First pass: create a map of all comments
  flatComments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] })
  })

  // Second pass: build the tree structure naturally
  flatComments.forEach(comment => {
    if (comment.parentId && commentMap.has(comment.parentId)) {
      // This is a reply, add it to its parent
      const parent = commentMap.get(comment.parentId)
      parent.replies.push(commentMap.get(comment.id))
      // Set depth for visual nesting
      commentMap.get(comment.id).depth = (parent.depth || 0) + 1
    } else {
      // This is a root comment
      rootComments.push(commentMap.get(comment.id))
    }
  })

  // Sort replies by creation time (newest first)
  const sortReplies = (comments: any[]) => {
    comments.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.sort((a: any, b: any) => {
          // Sort by timeAgo (assuming newer comments come first in the original array)
          return flatComments.findIndex(c => c.id === a.id) - 
                 flatComments.findIndex(c => c.id === b.id)
        })
        sortReplies(comment.replies)
      }
    })
  }

  sortReplies(rootComments)
  return rootComments
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Parse the request body first (can only be done once)
    const body = await request.json()
    const { postId, text, userName, replyId } = body // Add replyId for nested comments

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
    
    if (!commentLimitCheck.allowed) {
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
        replyId: replyId || '', // Use replyId for nested comments
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
    } catch (updateError) {
      console.error('Error updating comment count for post:', postId, updateError)
      // Don't fail the comment creation if the count update fails
      // The comment was created successfully, just the count couldn't be updated
    }

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

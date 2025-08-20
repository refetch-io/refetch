import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, Account } from 'node-appwrite'

// Initialize Appwrite clients for server-side operations
const apiKeyClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '')

const jwtClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')

const databases = new Databases(apiKeyClient)
const account = new Account(jwtClient)

// Database and collection IDs
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || ''
const COMMENTS_COLLECTION_ID = process.env.APPWRITE_COMMENTS_COLLECTION_ID || ''
const POSTS_COLLECTION_ID = process.env.APPWRITE_POSTS_COLLECTION_ID || ''

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const commentId = params.id

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      )
    }

    // Get and validate JWT token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const jwt = authHeader.replace('Bearer ', '')

    // Use the JWT client to validate the token and get user information
    let user
    try {
      jwtClient.setJWT(jwt)
      user = await account.get()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired JWT token' },
        { status: 401 }
      )
    }

    if (!user.$id) {
      return NextResponse.json(
        { error: 'Invalid user information' },
        { status: 401 }
      )
    }

    // Get the comment to check ownership and get postId
    let comment
    try {
      comment = await databases.getDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION_ID,
        commentId
      )
    } catch (error) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Check if the user owns this comment
    if (comment.userId !== user.$id) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 }
      )
    }

    // Delete the comment
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION_ID,
        commentId
      )
    } catch (error) {
      console.error('Error deleting comment:', error)
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      )
    }

    // Decrease the comment count on the post
    try {
      await databases.incrementDocumentAttribute(
        DATABASE_ID,
        POSTS_COLLECTION_ID,
        comment.postId,
        'countComments',
        -1, // decrement by 1
        0 // minimum limit of 0
      )
    } catch (updateError) {
      console.error('Error updating comment count for post:', comment.postId, updateError)
      // Don't fail the deletion if the count update fails
      // The comment was deleted successfully, just the count couldn't be updated
    }

    return NextResponse.json({ 
      success: true,
      message: 'Comment deleted successfully' 
    })

  } catch (error) {
    console.error('Error in comment deletion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

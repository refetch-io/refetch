import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, Account, Query } from 'node-appwrite'

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
const POSTS_COLLECTION_ID = process.env.APPWRITE_POSTS_COLLECTION_ID || ''
const VOTES_COLLECTION_ID = process.env.APPWRITE_VOTES_COLLECTION_ID || ''

export async function GET(request: NextRequest) {
  try {
    // Get postId from query parameters
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json(
        { message: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Get and validate JWT token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const jwt = authHeader.replace('Bearer ', '')

    // Use the JWT client to validate the token
    let user
    try {
      jwtClient.setJWT(jwt)
      user = await account.get()
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid or expired JWT token' },
        { status: 401 }
      )
    }

    // Get the post to get the current score
    let postScore = 0
    try {
      const post = await databases.getDocument(
        DATABASE_ID,
        POSTS_COLLECTION_ID,
        postId
      )
      postScore = (post.countUp || 0) - (post.countDown || 0)
    } catch (error) {
      console.error('Error fetching post score:', error)
      // Continue with score 0 if post not found
    }

    // Check if user has already voted on this post
    const existingVote = await databases.listDocuments(
      DATABASE_ID,
      VOTES_COLLECTION_ID,
      [
        Query.equal('userId', user.$id),
        Query.equal('postId', postId)
      ]
    )

    if (existingVote.documents.length > 0) {
      const vote = existingVote.documents[0]
      const currentVote = vote.count === 1 ? 'up' : 'down'
      
      return NextResponse.json({
        currentVote,
        score: postScore
      })
    } else {
      return NextResponse.json({
        currentVote: null,
        score: postScore
      })
    }

  } catch (error) {
    console.error('Error fetching vote state:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

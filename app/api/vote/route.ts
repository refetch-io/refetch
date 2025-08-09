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
const POSTS_COLLECTION_ID = process.env.APPWRITE_POSTS_COLLECTION_ID || ''
const VOTES_COLLECTION_ID = process.env.APPWRITE_VOTES_COLLECTION_ID || ''

// Debug logging
console.log('Vote API Environment Variables:')
console.log('DATABASE_ID:', DATABASE_ID)
console.log('POSTS_COLLECTION_ID:', POSTS_COLLECTION_ID)
console.log('VOTES_COLLECTION_ID:', VOTES_COLLECTION_ID)
console.log('ENDPOINT:', process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
console.log('PROJECT_ID:', process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)

export async function POST(request: NextRequest) {
  try {
    // Step 1: Parse the request body
    const body = await request.json()
    const { postId, voteType } = body

    console.log('Vote request:', { postId, voteType })

    // Validate required fields
    if (!postId || !voteType) {
      return NextResponse.json(
        { message: 'Post ID and vote type are required' },
        { status: 400 }
      )
    }

    if (voteType !== 'up' && voteType !== 'down') {
      return NextResponse.json(
        { message: 'Vote type must be either "up" or "down"' },
        { status: 400 }
      )
    }

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
    let user
    try {
      jwtClient.setJWT(jwt)
      user = await account.get()
      console.log('User authenticated:', user.$id)
    } catch (error) {
      console.error('JWT validation error:', error)
      return NextResponse.json(
        { message: 'Invalid or expired JWT token' },
        { status: 401 }
      )
    }

    // Convert vote type to count value
    const voteCount = voteType === 'up' ? 1 : -1

    // Get the current post data to access the count field
    let currentPost
    try {
      currentPost = await databases.getDocument(
        DATABASE_ID,
        POSTS_COLLECTION_ID,
        postId
      )
    } catch (error) {
      console.error('Error fetching post:', error)
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      )
    }

    // Step 3: Check if user has already voted on this post
    console.log('Checking existing vote for user:', user.$id, 'post:', postId)
    const existingVote = await databases.listDocuments(
      DATABASE_ID,
      VOTES_COLLECTION_ID,
      [
        Query.equal('userId', user.$id),
        Query.equal('postId', postId)
      ]
    )

    console.log('Existing votes found:', existingVote.documents.length)

    if (existingVote.documents.length > 0) {
      const previousVote = existingVote.documents[0]
      console.log('Previous vote:', previousVote)
      
      // If user is voting the same way, remove the vote
      if (previousVote.count === voteCount) {
        console.log('Removing vote')
        // Delete the vote record
        await databases.deleteDocument(
          DATABASE_ID,
          VOTES_COLLECTION_ID,
          previousVote.$id
        )

        // Update the post count field (decrease by the vote value)
        const countChange = voteType === 'up' ? -1 : 1
        console.log('Decrementing count field by:', countChange, 'for post:', postId)
        await databases.updateDocument(
          DATABASE_ID,
          POSTS_COLLECTION_ID,
          postId,
          {
            count: currentPost.count + countChange
          }
        )

        return NextResponse.json({
          message: 'Vote removed successfully',
          action: 'removed',
          voteType: null
        })
      } else {
        console.log('Changing vote from', previousVote.count, 'to', voteCount)
        // If user is changing their vote, update the vote record
        await databases.updateDocument(
          DATABASE_ID,
          VOTES_COLLECTION_ID,
          previousVote.$id,
          {
            count: voteCount
          }
        )

        // Update the post count field (remove previous vote effect and add new vote effect)
        const previousVoteValue = previousVote.count === 1 ? 1 : -1
        const newVoteValue = voteType === 'up' ? 1 : -1
        const countChange = -previousVoteValue + newVoteValue
        
        console.log('Updating count field by:', countChange, 'for post:', postId)
        await databases.updateDocument(
          DATABASE_ID,
          POSTS_COLLECTION_ID,
          postId,
          {
            count: currentPost.count + countChange
          }
        )

        return NextResponse.json({
          message: 'Vote updated successfully',
          action: 'updated',
          voteType: voteType
        })
      }
    } else {
      console.log('Creating new vote')
      // Step 4: Create new vote record
      await databases.createDocument(
        DATABASE_ID,
        VOTES_COLLECTION_ID,
        ID.unique(),
        {
          userId: user.$id,
          postId: postId,
          count: voteCount
        }
      )

      // Step 5: Update the post count field
      const countChange = voteType === 'up' ? 1 : -1
      console.log('Updating count field by:', countChange, 'for post:', postId)
      await databases.updateDocument(
        DATABASE_ID,
        POSTS_COLLECTION_ID,
        postId,
        {
          count: currentPost.count + countChange
        }
      )

      return NextResponse.json({
        message: 'Vote submitted successfully',
        action: 'added',
        voteType: voteType
      })
    }

  } catch (error) {
    console.error('Error processing vote:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name
      })
    }
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

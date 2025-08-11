import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, Account, ID, Query } from 'node-appwrite'
import type { VoteRequest } from '@/lib/types'

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
const COMMENTS_COLLECTION_ID = process.env.APPWRITE_COMMENTS_COLLECTION_ID || ''
const VOTES_COLLECTION_ID = process.env.APPWRITE_VOTES_COLLECTION_ID || ''

// Debug logging
console.log('Vote API Environment Variables:')
console.log('DATABASE_ID:', DATABASE_ID)
console.log('POSTS_COLLECTION_ID:', POSTS_COLLECTION_ID)
console.log('COMMENTS_COLLECTION_ID:', COMMENTS_COLLECTION_ID)
console.log('VOTES_COLLECTION_ID:', VOTES_COLLECTION_ID)
console.log('ENDPOINT:', process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
console.log('PROJECT_ID:', process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)

export async function POST(request: NextRequest) {
  try {
    // Step 1: Parse the request body
    const body: VoteRequest = await request.json()
    const { resourceId, resourceType, voteType } = body

    console.log('Vote request:', { resourceId, resourceType, voteType })

    // Validate required fields
    if (!resourceId || !resourceType || !voteType) {
      return NextResponse.json(
        { message: 'Resource ID, resource type, and vote type are required' },
        { status: 400 }
      )
    }

    if (resourceType !== 'post' && resourceType !== 'comment') {
      return NextResponse.json(
        { message: 'Resource type must be either "post" or "comment"' },
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

    // Determine which collection to use based on resource type
    const targetCollectionId = resourceType === 'post' ? POSTS_COLLECTION_ID : COMMENTS_COLLECTION_ID

    // Step 3: Check if user has already voted on this resource
    console.log('Checking existing vote for user:', user.$id, 'resource:', resourceId, 'type:', resourceType)
    const existingVote = await databases.listDocuments(
      DATABASE_ID,
      VOTES_COLLECTION_ID,
      [
        Query.equal('userId', user.$id),
        Query.equal('resourceId', resourceId),
        Query.equal('resourceType', resourceType)
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

        // Use atomic operations to update the resource count fields
        if (voteType === 'up') {
          // Removing upvote: decrease countUp and count
          await databases.decrementDocumentAttribute(
            DATABASE_ID,
            targetCollectionId,
            resourceId,
            'countUp',
            1,
            0 // min value to prevent negative counts
          )
          await databases.decrementDocumentAttribute(
            DATABASE_ID,
            targetCollectionId,
            resourceId,
            'count',
            1
          )
        } else {
          // Removing downvote: decrease countDown and increase count
          await databases.decrementDocumentAttribute(
            DATABASE_ID,
            targetCollectionId,
            resourceId,
            'countDown',
            1,
            0 // min value to prevent negative counts
          )
          await databases.incrementDocumentAttribute(
            DATABASE_ID,
            targetCollectionId,
            resourceId,
            'count',
            1
          )
        }

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

        // Use atomic operations to update the resource count fields
        if (previousVote.count === 1) {
          // Previous was upvote, new is downvote
          // Decrease countUp, increase countDown, decrease count by 2
          await databases.decrementDocumentAttribute(
            DATABASE_ID,
            targetCollectionId,
            resourceId,
            'countUp',
            1,
            0 // min value to prevent negative counts
          )
          await databases.incrementDocumentAttribute(
            DATABASE_ID,
            targetCollectionId,
            resourceId,
            'countDown',
            1
          )
          await databases.decrementDocumentAttribute(
            DATABASE_ID,
            targetCollectionId,
            resourceId,
            'count',
            2
          )
        } else {
          // Previous was downvote, new is upvote
          // Increase countUp, decrease countDown, increase count by 2
          await databases.incrementDocumentAttribute(
            DATABASE_ID,
            targetCollectionId,
            resourceId,
            'countUp',
            1
          )
          await databases.decrementDocumentAttribute(
            DATABASE_ID,
            targetCollectionId,
            resourceId,
            'countDown',
            1,
            0 // min value to prevent negative counts
          )
          await databases.incrementDocumentAttribute(
            DATABASE_ID,
            targetCollectionId,
            resourceId,
            'count',
            2
          )
        }

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
          resourceId: resourceId,
          resourceType: resourceType,
          count: voteCount
        }
      )

      // Step 5: Use atomic operations to update the resource count fields
      if (voteType === 'up') {
        // New upvote: increase countUp and count
        await databases.incrementDocumentAttribute(
          DATABASE_ID,
          targetCollectionId,
          resourceId,
          'countUp',
          1
        )
        await databases.incrementDocumentAttribute(
          DATABASE_ID,
          targetCollectionId,
          resourceId,
          'count',
          1
        )
      } else {
        // New downvote: increase countDown and decrease count
        await databases.incrementDocumentAttribute(
          DATABASE_ID,
          targetCollectionId,
          resourceId,
          'countDown',
          1
        )
        await databases.decrementDocumentAttribute(
          DATABASE_ID,
          targetCollectionId,
          resourceId,
          'count',
          1
        )
      }

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

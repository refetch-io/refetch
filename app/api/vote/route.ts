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

export async function POST(request: Request) {
  try {
    const { resourceId, resourceType, voteType } = await request.json()

    // Validate required fields
    if (!resourceId || !resourceType || !voteType) {
      return NextResponse.json(
        { error: 'Missing required fields: resourceId, resourceType, voteType' },
        { status: 400 }
      )
    }

    // Validate vote type
    if (!['up', 'down'].includes(voteType)) {
      return NextResponse.json(
        { error: 'Invalid vote type. Must be "up" or "down"' },
        { status: 400 }
      )
    }

    // Validate resource type
    if (!['post', 'comment'].includes(resourceType)) {
      return NextResponse.json(
        { error: 'Invalid resource type. Must be "post" or "comment"' },
        { status: 400 }
      )
    }

    // Check environment variables
    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID
    const POSTS_COLLECTION_ID = process.env.APPWRITE_POSTS_COLLECTION_ID
    const COMMENTS_COLLECTION_ID = process.env.APPWRITE_COMMENTS_COLLECTION_ID
    const VOTES_COLLECTION_ID = process.env.APPWRITE_VOTES_COLLECTION_ID

    if (!DATABASE_ID || !POSTS_COLLECTION_ID || !COMMENTS_COLLECTION_ID || !VOTES_COLLECTION_ID) {
      console.error('Missing required environment variables for voting')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const jwt = authHeader.substring(7)
    
    // Initialize Appwrite client
    const { Client, Databases, Query } = await import('node-appwrite')
    
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!)

    const databases = new Databases(client)

    // Verify JWT and get user
    let user
    try {
      const { ID, Account } = await import('node-appwrite')
      const account = new Account(client)
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

    // Check if user has already voted on this resource
    const existingVote = await databases.listDocuments(
      DATABASE_ID,
      VOTES_COLLECTION_ID,
      [
        Query.equal('userId', user.$id),
        Query.equal('resourceId', resourceId),
        Query.equal('resourceType', resourceType)
      ]
    )

    let voteDocument
    let isNewVote = false

    if (existingVote.documents.length > 0) {
      // Update existing vote
      voteDocument = existingVote.documents[0]
      const oldVoteType = voteDocument.count === 1 ? 'up' : 'down'
      
      if (oldVoteType === voteType) {
        // Remove vote (same vote type clicked again)
        await databases.deleteDocument(
          DATABASE_ID,
          VOTES_COLLECTION_ID,
          voteDocument.$id
        )
        voteDocument = null
      } else {
        // Change vote type
        await databases.updateDocument(
          DATABASE_ID,
          VOTES_COLLECTION_ID,
          voteDocument.$id,
          {
            count: voteType === 'up' ? 1 : -1
          }
        )
        voteDocument.count = voteType === 'up' ? 1 : -1
      }
    } else {
      // Create new vote
      const { ID } = await import('node-appwrite')
      voteDocument = await databases.createDocument(
        DATABASE_ID,
        VOTES_COLLECTION_ID,
        ID.unique(),
        {
          userId: user.$id,
          resourceId,
          resourceType,
          count: voteType === 'up' ? 1 : -1
        }
      )
      isNewVote = true
    }

    // Update resource score
    const collectionId = resourceType === 'post' ? POSTS_COLLECTION_ID : COMMENTS_COLLECTION_ID
    const resource = await databases.getDocument(DATABASE_ID, collectionId, resourceId)
    
    let newScore = resource.count || 0
    
    if (voteDocument) {
      if (isNewVote) {
        // Add new vote
        newScore += voteDocument.count
      } else {
        // Vote was changed, calculate the difference
        const oldVoteType = existingVote.documents[0].count === 1 ? 'up' : 'down'
        if (oldVoteType === 'up' && voteType === 'down') {
          newScore -= 2 // From +1 to -1 = -2
        } else if (oldVoteType === 'down' && voteType === 'up') {
          newScore += 2 // From -1 to +1 = +2
        }
      }
    } else {
      // Vote was removed
      const oldVoteType = existingVote.documents[0].count === 1 ? 'up' : 'down'
      newScore -= oldVoteType === 'up' ? 1 : -1
    }

    // Update the resource with new score
    await databases.updateDocument(
      DATABASE_ID,
      collectionId,
      resourceId,
      {
        count: newScore,
        countUp: resource.countUp || 0,
        countDown: resource.countDown || 0
      }
    )

    // Update up/down counts
    if (voteDocument) {
      if (isNewVote) {
        // New vote
        if (voteType === 'up') {
          await databases.updateDocument(
            DATABASE_ID,
            collectionId,
            resourceId,
            { countUp: (resource.countUp || 0) + 1 }
          )
        } else {
          await databases.updateDocument(
            DATABASE_ID,
            collectionId,
            resourceId,
            { countDown: (resource.countDown || 0) + 1 }
          )
        }
      } else {
        // Vote changed
        const oldVoteType = existingVote.documents[0].count === 1 ? 'up' : 'down'
        if (oldVoteType === 'up' && voteType === 'down') {
          await databases.updateDocument(
            DATABASE_ID,
            collectionId,
            resourceId,
            { 
              countUp: (resource.countUp || 0) - 1,
              countDown: (resource.countDown || 0) + 1
            }
          )
        } else if (oldVoteType === 'down' && voteType === 'up') {
          await databases.updateDocument(
            DATABASE_ID,
            collectionId,
            resourceId,
            { 
              countUp: (resource.countUp || 0) + 1,
              countDown: (resource.countDown || 0) - 1
            }
          )
        }
      }
    } else {
      // Vote removed
      const oldVoteType = existingVote.documents[0].count === 1 ? 'up' : 'down'
      if (oldVoteType === 'up') {
        await databases.updateDocument(
          DATABASE_ID,
          collectionId,
          resourceId,
          { countUp: (resource.countUp || 0) - 1 }
        )
      } else {
        await databases.updateDocument(
          DATABASE_ID,
          collectionId,
          resourceId,
          { countDown: (resource.countDown || 0) - 1 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: voteDocument ? 'Vote recorded successfully' : 'Vote removed successfully',
      newScore,
      voteType: voteDocument ? voteType : null
    })

  } catch (error) {
    console.error('Error processing vote:', error)
    return NextResponse.json(
      { error: 'Failed to process vote' },
      { status: 500 }
    )
  }
}

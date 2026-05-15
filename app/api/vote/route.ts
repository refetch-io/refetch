import { NextRequest, NextResponse } from 'next/server'
import { Client, TablesDB, Account, ID, Query } from 'node-appwrite'
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

const tablesDB = new TablesDB(apiKeyClient)
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
      // Use the jwtClient that was already initialized at the top of the file
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

    // Check if user has already voted on this resource
    const existingVote = await tablesDB.listRows(
      DATABASE_ID,
      VOTES_COLLECTION_ID,
      [
        Query.equal('userId', user.$id),
        Query.equal('resourceId', resourceId),
        Query.equal('resourceType', resourceType)
      ]
    )

    console.log(`Vote check for user ${user.$id} on ${resourceType} ${resourceId}:`, {
      existingVotes: existingVote.rows.length,
      requestedVoteType: voteType,
      existingVoteType: existingVote.rows.length > 0 ? (existingVote.rows[0].count === 1 ? 'up' : 'down') : 'none'
    })

    // Get the current resource to see existing counts
    const collectionId = resourceType === 'post' ? POSTS_COLLECTION_ID : COMMENTS_COLLECTION_ID
    const resource = await tablesDB.getRow(DATABASE_ID, collectionId, resourceId)
    
    let newScore = resource.count || 0
    let newCountUp = resource.countUp || 0
    let newCountDown = resource.countDown || 0

    if (existingVote.rows.length > 0) {
      // User has an existing vote
      const existingVoteType = existingVote.rows[0].count === 1 ? 'up' : 'down'
      
      if (existingVoteType === voteType) {
        // Same vote type clicked again - REMOVE the vote
        console.log(`Removing ${existingVoteType} vote for ${resourceType} ${resourceId}`)
        
        // Delete the vote document
        await tablesDB.deleteRow(
          DATABASE_ID,
          VOTES_COLLECTION_ID,
          existingVote.rows[0].$id
        )
        
        // Update counters using atomic operations
        if (existingVoteType === 'up') {
          await tablesDB.decrementRowColumn(
            DATABASE_ID,
            collectionId,
            resourceId,
            'count',
            1
          )
          await tablesDB.decrementRowColumn(
            DATABASE_ID,
            collectionId,
            resourceId,
            'countUp',
            1
          )
        } else {
          await tablesDB.incrementRowColumn(
            DATABASE_ID,
            collectionId,
            resourceId,
            'count',
            1
          )
          await tablesDB.decrementRowColumn(
            DATABASE_ID,
            collectionId,
            resourceId,
            'countDown',
            1
          )
        }
        
      } else {
        // Different vote type clicked - CHANGE the vote
        console.log(`Changing vote from ${existingVoteType} to ${voteType} for ${resourceType} ${resourceId}`)
        
        // Update the vote document
        await tablesDB.updateRow(
          DATABASE_ID,
          VOTES_COLLECTION_ID,
          existingVote.rows[0].$id,
          {
            count: voteType === 'up' ? 1 : -1
          }
        )
        
        // Update counters using atomic operations
        if (existingVoteType === 'up' && voteType === 'down') {
          // From up to down: -1 for up, +1 for down, total change = -2
          await tablesDB.decrementRowColumn(
            DATABASE_ID,
            collectionId,
            resourceId,
            'count',
            2
          )
          await tablesDB.decrementRowColumn(
            DATABASE_ID,
            collectionId,
            resourceId,
            'countUp',
            1
          )
          await tablesDB.incrementRowColumn(
            DATABASE_ID,
            collectionId,
            resourceId,
            'countDown',
            1
          )
        } else {
          // From down to up: +1 for down, +1 for up, total change = +2
          await tablesDB.incrementRowColumn(
            DATABASE_ID,
            collectionId,
            resourceId,
            'count',
            2
          )
          await tablesDB.decrementRowColumn(
            DATABASE_ID,
            collectionId,
            resourceId,
            'countDown',
            1
          )
          await tablesDB.incrementRowColumn(
            DATABASE_ID,
            collectionId,
            resourceId,
            'countUp',
            1
          )
        }
      }
      
    } else {
      // User has no existing vote - CREATE new vote
      console.log(`Creating new ${voteType} vote for ${resourceType} ${resourceId}`)
      
      // Create the vote document
      const { ID } = await import('node-appwrite')
      await tablesDB.createRow(
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
      
      // Update counters using atomic operations
      if (voteType === 'up') {
        await tablesDB.incrementRowColumn(
          DATABASE_ID,
          collectionId,
          resourceId,
          'count',
          1
        )
        await tablesDB.incrementRowColumn(
          DATABASE_ID,
          collectionId,
          resourceId,
          'countUp',
          1
        )
      } else {
        await tablesDB.decrementRowColumn(
          DATABASE_ID,
          collectionId,
          resourceId,
          'count',
          1
        )
        await tablesDB.incrementRowColumn(
          DATABASE_ID,
          collectionId,
          resourceId,
          'countDown',
          1
        )
      }
    }

    // Get the final resource state to verify counters
    try {
      const finalResource = await tablesDB.getRow(DATABASE_ID, collectionId, resourceId)
      console.log(`Final state for ${resourceType} ${resourceId}:`, {
        score: finalResource.count,
        countUp: finalResource.countUp,
        countDown: finalResource.countDown
      })
    } catch (error) {
      console.error('Error getting final resource state:', error)
    }

    // Determine the operation type for the response
    let operationType = 'created'
    let finalVoteType = voteType
    
    if (existingVote.rows.length > 0) {
      const existingVoteType = existingVote.rows[0].count === 1 ? 'up' : 'down'
      if (existingVoteType === voteType) {
        operationType = 'removed'
        finalVoteType = null
      } else {
        operationType = 'changed'
        finalVoteType = voteType
      }
    }

    return NextResponse.json({
      success: true,
      message: `Vote ${operationType} successfully`,
      newScore,
      voteType: finalVoteType
    })

  } catch (error) {
    console.error('Error processing vote:', error)
    return NextResponse.json(
      { error: 'Failed to process vote' },
      { status: 500 }
    )
  }
}

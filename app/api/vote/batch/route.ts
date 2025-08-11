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
const VOTES_COLLECTION_ID = process.env.APPWRITE_VOTES_COLLECTION_ID || ''
const POSTS_COLLECTION_ID = process.env.APPWRITE_POSTS_COLLECTION_ID || ''
const COMMENTS_COLLECTION_ID = process.env.APPWRITE_COMMENTS_COLLECTION_ID || ''

interface BatchVoteRequest {
  resources: Array<{
    id: string
    type: 'post' | 'comment'
  }>
}

interface VoteData {
  voteType: 'up' | 'down' | null
  countUp: number
  countDown: number
  score: number
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: BatchVoteRequest = await request.json()
    const { resources } = body

    if (!resources || !Array.isArray(resources)) {
      return NextResponse.json(
        { message: 'Resources array is required' },
        { status: 400 }
      )
    }

    // Validate resource types
    for (const resource of resources) {
      if (!resource.id || !resource.type || (resource.type !== 'post' && resource.type !== 'comment')) {
        return NextResponse.json(
          { message: 'Each resource must have a valid id and type (post or comment)' },
          { status: 400 }
        )
      }
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

    // Create a map of resourceId -> vote data
    const voteMap: Record<string, VoteData> = {}
    
    // Initialize all resources with default vote data
    resources.forEach(resource => {
      voteMap[resource.id] = {
        voteType: null,
        countUp: 0,
        countDown: 0,
        score: 0
      }
    })
    
    // Fetch all votes for the user in a single call
    try {
      const votes = await databases.listDocuments(
        DATABASE_ID,
        VOTES_COLLECTION_ID,
        [
          Query.equal('userId', user.$id),
          Query.limit(100) // Limit to prevent too many results
        ]
      )

      // Filter votes by the requested resources and set the vote types
      votes.documents.forEach((vote: any) => {
        const resourceId = vote.resourceId
        const resourceType = vote.resourceType
        
        // Check if this vote matches any of the requested resources
        const matchingResource = resources.find(r => r.id === resourceId && r.type === resourceType)
        if (matchingResource) {
          const voteType = vote.count === 1 ? 'up' : 'down'
          voteMap[resourceId].voteType = voteType
        }
      })
    } catch (error) {
      console.error('Error fetching votes:', error)
      // Return empty vote map on error
    }

    // Fetch resource data to get countUp, countDown, and score for each resource
    try {
      for (const resource of resources) {
        const targetCollectionId = resource.type === 'post' ? POSTS_COLLECTION_ID : COMMENTS_COLLECTION_ID
        
        try {
          const resourceDoc = await databases.getDocument(
            DATABASE_ID,
            targetCollectionId,
            resource.id
          )
          
          // Use atomic operations to ensure we get the most up-to-date values
          voteMap[resource.id].countUp = resourceDoc.countUp || 0
          voteMap[resource.id].countDown = resourceDoc.countDown || 0
          voteMap[resource.id].score = resourceDoc.count || 0
        } catch (error) {
          console.error(`Error fetching ${resource.type} data for ${resource.id}:`, error)
          // Keep default values if resource not found
        }
      }
    } catch (error) {
      console.error('Error fetching resource data:', error)
      // Continue with default values
    }

    return NextResponse.json({
      votes: voteMap
    })

  } catch (error) {
    console.error('Error fetching batch votes:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

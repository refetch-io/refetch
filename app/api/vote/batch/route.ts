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

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json()
    const { postIds } = body

    if (!postIds || !Array.isArray(postIds)) {
      return NextResponse.json(
        { message: 'Post IDs array is required' },
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

    // Create a map of postId -> vote type
    const voteMap: Record<string, 'up' | 'down' | null> = {}
    
    // Initialize all posts with null vote
    postIds.forEach(postId => {
      voteMap[postId] = null
    })
    
    // Fetch all votes for the user in a single call
    try {
      const votes = await databases.listDocuments(
        DATABASE_ID,
        VOTES_COLLECTION_ID,
        [
          Query.equal('userId', user.$id),
          Query.equal('postId', postIds),
          Query.limit(100) // Limit to prevent too many results
        ]
      )

      // Filter votes by the requested post IDs and set the vote types
      votes.documents.forEach((vote: any) => {
        if (postIds.includes(vote.postId)) {
          const voteType = vote.count === 1 ? 'up' : 'down'
          voteMap[vote.postId] = voteType
        }
      })
    } catch (error) {
      console.error('Error fetching votes:', error)
      // Return empty vote map on error
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

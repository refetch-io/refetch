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

// Environment variables
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || ''
const POSTS_COLLECTION_ID = process.env.APPWRITE_POSTS_COLLECTION_ID || ''
const COMMENTS_COLLECTION_ID = process.env.APPWRITE_COMMENTS_COLLECTION_ID || ''
const VOTES_COLLECTION_ID = process.env.APPWRITE_VOTES_COLLECTION_ID || ''

export async function POST(request: NextRequest) {
  try {
    // Get resource IDs and types from request body instead of query parameters
    const body = await request.json()
    const { resources } = body

    if (!resources || !Array.isArray(resources) || resources.length === 0) {
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
        { status: 400 }
      )
    }

    // Initialize vote map with default values
    const voteMap: Record<string, any> = {}
    resources.forEach(resource => {
      voteMap[resource.id] = {
        currentVote: null,
        count: 0,
        countUp: 0,
        countDown: 0
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
          voteMap[resourceId].currentVote = voteType
        }
      })
    } catch (error) {
      console.error('Error fetching votes:', error)
      // Return empty vote map on error
    }

    // Fetch resource data to get countUp, countDown, and score for each resource
    try {
      // Separate posts and comments to fetch them in batches
      const postIds = resources.filter(r => r.type === 'post').map(r => r.id)
      const commentIds = resources.filter(r => r.type === 'comment').map(r => r.id)
      
      // Fetch all posts in a single query
      if (postIds.length > 0) {
        try {
          const posts = await databases.listDocuments(
            DATABASE_ID,
            POSTS_COLLECTION_ID,
            [Query.equal('$id', postIds)]
          )
          
          // Update vote map with post data
          posts.documents.forEach((post: any) => {
            voteMap[post.$id].countUp = post.countUp || 0
            voteMap[post.$id].countDown = post.countDown || 0
            voteMap[post.$id].count = post.count || 0
          })
        } catch (error) {
          console.error('Error fetching posts data:', error)
        }
      }
      
      // Fetch all comments in a single query
      if (commentIds.length > 0) {
        try {
          const comments = await databases.listDocuments(
            DATABASE_ID,
            COMMENTS_COLLECTION_ID,
            [Query.equal('$id', commentIds)]
          )
          
          // Update vote map with comment data
          comments.documents.forEach((comment: any) => {
            voteMap[comment.$id].countUp = comment.countUp || 0
            voteMap[comment.$id].countDown = comment.countDown || 0
            voteMap[comment.$id].count = comment.count || 0
          })
        } catch (error) {
          console.error('Error fetching comments data:', error)
        }
      }
    } catch (error) {
      console.error('Error fetching resource data:', error)
      // Continue with default values if the query fails
    }

    return NextResponse.json({ voteMap })

  } catch (error) {
    console.error('Error in batch vote state endpoint:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

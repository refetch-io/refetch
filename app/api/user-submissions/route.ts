import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, Account, Query } from 'node-appwrite'
import { fetchVotesForPosts, convertAppwritePostToNewsItem } from '@/lib/data'

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

export async function GET(request: NextRequest) {
  try {
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

    // Fetch posts by the current user
    const posts = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID || '',
      process.env.APPWRITE_POSTS_COLLECTION_ID || '',
      [
        Query.equal('userId', user.$id),
        Query.orderDesc('$createdAt')
      ]
    )

    // Convert posts to NewsItem format and add vote information
    const appwritePosts = posts.documents.map((post: any, index: number) => 
      convertAppwritePostToNewsItem(post, index)
    )

    // Fetch votes for all posts if there are any
    if (appwritePosts.length > 0) {
      const postIds = appwritePosts.map(post => post.id)
      const voteMap = await fetchVotesForPosts(postIds, user.$id)
      
      // Add vote information to each post
      appwritePosts.forEach(post => {
        post.currentVote = voteMap.get(post.id) || null
      })
    }

    return NextResponse.json({
      posts: appwritePosts,
      total: posts.total
    })

  } catch (error) {
    console.error('Error fetching user submissions:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

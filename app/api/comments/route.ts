import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, Account, ID } from 'node-appwrite'

export async function POST(request: NextRequest) {
  try {
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

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const jwt = authHeader.replace('Bearer ', '')

    // Use the JWT client to validate the token
    let user
    try {
      jwtClient.setJWT(jwt)
      user = await account.get()
    } catch (error) {
      return NextResponse.json({ message: 'Invalid or expired JWT token' }, { status: 401 })
    }

    // Parse the request body
    const { postId, text } = await request.json()

    if (!postId || !text || !text.trim()) {
      return NextResponse.json({ message: 'Post ID and comment text are required' }, { status: 400 })
    }

    // Create the comment in the database
    const comment = await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_COMMENTS_COLLECTION_ID!,
      ID.unique(),
      {
        postId,
        text: text.trim(),
        authorId: user.$id,
        authorName: user.name || 'Anonymous',
        score: 1,
        createdAt: new Date().toISOString()
      }
    )

    return NextResponse.json({ 
      message: 'Comment posted successfully',
      commentId: comment.$id 
    })

  } catch (error) {
    console.error('Error posting comment:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

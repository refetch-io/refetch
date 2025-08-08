import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, Account, Users, ID } from 'node-appwrite'
import { PostMetadataEnhancer } from '@/lib/openai'
import { PostSubmissionData } from '@/lib/types'

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
const users = new Users(apiKeyClient)

// Database and collection IDs
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || ''
const COLLECTION_ID = process.env.APPWRITE_POSTS_COLLECTION_ID || ''

export async function POST(request: NextRequest) {
  try {
    // Step 1: Parse the request body first (can only be done once)
    const body = await request.json()
    const { title, url, description, company, location, salary, type } = body

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
    const jwtAccount = new Account(jwtClient)
    let user
    try {
      console.log('Received JWT:', jwt)
      // Set the JWT on the client and get user information
      jwtClient.setJWT(jwt)
      user = await jwtAccount.get()
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid or expired JWT token' },
        { status: 401 }
      )
    }

    // Validate required fields based on type
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { message: 'Title is required' },
        { status: 400 }
      )
    }

    if (type === 'link' && (!url || url.trim().length === 0)) {
      return NextResponse.json(
        { message: 'URL is required for link submissions' },
        { status: 400 }
      )
    }

    if (type === 'show' && (!description || description.trim().length === 0)) {
      return NextResponse.json(
        { message: 'Description is required for show submissions' },
        { status: 400 }
      )
    }

    if (type === 'job') {
      if (!url || url.trim().length === 0) {
        return NextResponse.json(
          { message: 'Application URL is required for job submissions' },
          { status: 400 }
        )
      }
      if (!company || company.trim().length === 0) {
        return NextResponse.json(
          { message: 'Company is required for job submissions' },
          { status: 400 }
        )
      }
    }

    // Step 3: Enhance post with OpenAI metadata analysis
    const postData: PostSubmissionData = {
      title: title.trim(),
      description: description?.trim() || '',
      url: url?.trim(),
      company: company?.trim(),
      location: location?.trim(),
      salary: salary?.trim(),
      type: type
    }

    let metadata
    try {
      console.log('Enhancing post with OpenAI...')
      // Create a temporary metadata object with original content for OpenAI analysis
      const enhancedMetadata = await PostMetadataEnhancer.enhancePost(postData)
      metadata = {
        ...enhancedMetadata,
        originalTitle: postData.title,
        originalDescription: postData.description || ''
      }
      console.log('OpenAI enhancement completed:', metadata)
    } catch (error) {
      console.error('OpenAI enhancement failed, using default metadata:', error)
      // Continue with default metadata if OpenAI fails
      metadata = {
        language: 'English',
        category: type === 'show' ? 'show' : 'main',
        spellingScore: 80,
        spellingIssues: [],
        optimizedTitle: postData.title,
        optimizedDescription: postData.description || '',
        originalTitle: postData.title,
        originalDescription: postData.description || '',
        topics: [],
        spamScore: 10,
        spamIssues: [],
        safetyScore: 90,
        safetyIssues: [],
        readingLevel: 'Intermediate',
        readingTime: 5,
        titleTranslations: {},
        qualityScore: 50,
        qualityIssues: []
      }
    }

    // Step 4: Prepare the document data (only essential fields, no metadata)
    const documentData: any = {
      title: metadata.optimizedTitle || postData.title,
      description: metadata.optimizedDescription || postData.description,
      userId: user.$id,
      userName: user.name || user.email || 'Anonymous',
      countUp: 0,
      countDown: 0,
      type: type
    }

    // Add type-specific fields
    if (postData.url) {
      documentData.link = postData.url
    }

    if (type === 'job') {
      documentData.company = postData.company
      if (postData.location) documentData.location = postData.location
      if (postData.salary) documentData.salary = postData.salary
    }

    console.log('Creating document with enhanced metadata:', documentData)

    // Create the document in Appwrite using the server-side client
    const createdDocument = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      ID.unique(),
      documentData
    )

    return NextResponse.json({
      message: 'Post submitted successfully',
      postId: createdDocument.$id
    })

  } catch (error) {
    console.error('Error submitting post:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, Account, Users, ID } from 'node-appwrite'

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
const COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID || ''

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
    // const jwtAccount = new Account(jwtClient)
    // let user
    // try {
    //   // Set the JWT on the client and get user information
    //   jwtClient.setJWT(jwt)
    //   user = await jwtAccount.get()
    // } catch (error) {
    //   return NextResponse.json(
    //     { message: 'Invalid or expired JWT token' },
    //     { status: 401 }
    //   )
    // }
    const user = {
      $id: '123',
      name: 'John Doe',
      email: 'john.doe@example.com'
    };

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

    // Prepare the document data
    const documentData: any = {
      title: title.trim(),
      description: description?.trim() || '',
      userId: user.$id,
      userName: user.name || user.email || 'Anonymous',
      countUp: 0,
      countDown: 0,
      type: type
    }

    console.log(documentData)

    // Add type-specific fields
    if (url) {
      documentData.link = url.trim()
    }

    if (type === 'job') {
      documentData.company = company.trim()
      if (location) documentData.location = location.trim()
      if (salary) documentData.salary = salary.trim()
    }

    // Create the document in Appwrite using the server-side client
    // The client is already configured for server-side operations
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
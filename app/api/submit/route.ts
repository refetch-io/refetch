import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, Account, Users, ID, Query } from 'node-appwrite'
import { PostSubmissionData, PostDocument } from '@/lib/types'
import { cleanUrl } from '@/lib/utils'

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
const COMMENTS_COLLECTION_ID = process.env.APPWRITE_COMMENTS_COLLECTION_ID || ''

// Abuse protection constants
const MAX_SUBMISSIONS_PER_16_HOURS = 5
const SUBMISSION_WINDOW_HOURS = 16

// Helper function to check user submission count in the last 16 hours
async function checkUserSubmissionLimit(userId: string): Promise<{ allowed: boolean; count: number; limit: number }> {
  try {
    // Calculate the timestamp for 16 hours ago
    const sixteenHoursAgo = new Date(Date.now() - (SUBMISSION_WINDOW_HOURS * 60 * 60 * 1000))
    
    // Query for posts created by this user in the last 16 hours
    const recentPosts = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.greaterThan('$createdAt', sixteenHoursAgo.toISOString())
      ]
    )
    
    const submissionCount = recentPosts.documents.length
    const allowed = submissionCount < MAX_SUBMISSIONS_PER_16_HOURS
    
    return {
      allowed,
      count: submissionCount,
      limit: MAX_SUBMISSIONS_PER_16_HOURS
    }
  } catch (error) {
    console.error('Error checking user submission limit:', error)
    // If we can't check the limit, allow the submission to avoid blocking legitimate users
    return { allowed: true, count: 0, limit: MAX_SUBMISSIONS_PER_16_HOURS }
  }
}

// Helper function to check for duplicate URLs
async function checkDuplicateUrl(url: string): Promise<boolean> {
  try {
    const cleanUrlString = cleanUrl(url)
    const existingPosts = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [Query.equal('link', cleanUrlString)]
    )
    return existingPosts.documents.length > 0
  } catch (error) {
    console.error('Error checking for duplicate URL:', error)
    return false
  }
}

// Helper function to create a comment with the user's description
async function createDescriptionComment(postId: string, userId: string, userName: string, description: string): Promise<string | null> {
  try {
    if (!description || !description.trim()) {
      return null
    }

    // Clean and truncate the description for the comment
    let commentText = description.trim()
    
    // If description is too long, truncate it and add ellipsis
    if (commentText.length > 2000) {
      commentText = commentText.substring(0, 1997) + '...'
    }

    // Create the comment
    const comment = await databases.createDocument(
      DATABASE_ID,
      COMMENTS_COLLECTION_ID,
      ID.unique(),
      {
        postId,
        userId: userId,
        userName: userName,
        content: commentText,
        replyId: '', // Top-level comment
        countReports: 0
      }
    )

    return comment.$id
  } catch (error) {
    console.error('Error creating description comment:', error)
    return null
  }
}



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

    // Step 3: Check user submission limit (abuse protection)
    const submissionLimitCheck = await checkUserSubmissionLimit(user.$id)
    
    if (!submissionLimitCheck.allowed) {
      return NextResponse.json(
        { 
          message: `Submission limit exceeded. You can only submit ${submissionLimitCheck.limit} posts in a ${SUBMISSION_WINDOW_HOURS}-hour period. You have submitted ${submissionLimitCheck.count} posts in the last ${SUBMISSION_WINDOW_HOURS} hours.`,
          limit: submissionLimitCheck.limit,
          currentCount: submissionLimitCheck.count,
          windowHours: SUBMISSION_WINDOW_HOURS
        },
        { status: 429 }
      )
    }

    // Step 4: Check for duplicate URLs if URL is provided
    if (url && url.trim().length > 0) {
      const isDuplicate = await checkDuplicateUrl(url)
      if (isDuplicate) {
        return NextResponse.json(
          { message: 'A post with this URL already exists' },
          { status: 409 }
        )
      }
    }

    // Step 5: Prepare the document data
    const documentData: {
      title: string;
      description: string;
      userId: string;
      userName: string;
      count: number;
      countUp: number;
      countDown: number;
      type: string;
      enhanced: boolean;
      timeScore: number;
      link?: string;
      company?: string;
      location?: string;
      salary?: string;
    } = {
      title: title.trim(),
      description: description?.trim() || '',
      userId: user.$id,
      userName: user.name || user.email || 'Anonymous',
      count: 0,
      countUp: 0,
      countDown: 0,
      type: type,
      enhanced: false, // Default to false, will be updated by enhancement function
      timeScore: 100 // New posts start with maximum time score
    }

    // Add type-specific fields
    if (url && url.trim().length > 0) {
      // Store the cleaned URL (without query strings)
      documentData.link = cleanUrl(url.trim())
    }

    if (type === 'job') {
      documentData.company = company?.trim()
      if (location) documentData.location = location.trim()
      if (salary) documentData.salary = salary.trim()
    }

    // Create the document in Appwrite using the server-side client
    const createdDocument = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      ID.unique(),
      documentData
    )

    // Step 6: Create comment with user's description if provided
    if (description && description.trim().length > 0) {
      try {
        const commentId = await createDescriptionComment(
          createdDocument.$id,
          user.$id,
          user.name || user.email || 'Anonymous',
          description.trim()
        )
        
        if (commentId) {
          // Update the post with the comment count
          await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_ID,
            createdDocument.$id,
            { countComments: 1 }
          )
        }
      } catch (error) {
        console.error('Error creating description comment, but post was created successfully:', error)
        // Don't fail the post creation if comment creation fails
      }
    }

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
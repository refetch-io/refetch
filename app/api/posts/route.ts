import { NextRequest, NextResponse } from 'next/server'
import { fetchPostsFromAppwriteWithSortAndVotes } from '@/lib/data'

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const sortType = searchParams.get('sortType') as 'score' | 'new' | 'show' || 'score'
    const limit = parseInt(searchParams.get('limit') || '25')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Validate parameters
    if (!['score', 'new', 'show'].includes(sortType)) {
      return NextResponse.json(
        { message: 'Invalid sort type. Must be one of: score, new, show' },
        { status: 400 }
      )
    }
    
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { message: 'Invalid limit. Must be between 1 and 100' },
        { status: 400 }
      )
    }
    
    if (offset < 0) {
      return NextResponse.json(
        { message: 'Invalid offset. Must be 0 or greater' },
        { status: 400 }
      )
    }

    // Fetch posts with pagination
    const result = await fetchPostsFromAppwriteWithSortAndVotes(sortType, undefined, limit, offset)
    
    if (result.error) {
      return NextResponse.json(
        { message: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ posts: result.posts })
  } catch (error) {
    console.error('Error in posts API:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

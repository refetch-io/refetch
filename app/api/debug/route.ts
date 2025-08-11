import { NextResponse } from 'next/server'

export async function GET() {
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ? 'Set' : 'Missing',
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ? 'Set' : 'Missing',
    APPWRITE_API_KEY: process.env.APPWRITE_API_KEY ? 'Set' : 'Missing',
    APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID ? 'Set' : 'Missing',
    APPWRITE_POSTS_COLLECTION_ID: process.env.APPWRITE_POSTS_COLLECTION_ID ? 'Set' : 'Missing',
    APPWRITE_COMMENTS_COLLECTION_ID: process.env.APPWRITE_COMMENTS_COLLECTION_ID ? 'Set' : 'Missing'
  }

  return NextResponse.json({
    message: 'Environment variables check',
    envCheck,
    timestamp: new Date().toISOString()
  })
}

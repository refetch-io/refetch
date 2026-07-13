function read(key: string, fallback = ''): string {
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key] as string
  }
  try {
    const meta = import.meta.env as Record<string, string | undefined>
    return meta?.[key] ?? fallback
  } catch {
    return fallback
  }
}

export const env = {
  appwriteEndpoint:
    read('VITE_APPWRITE_ENDPOINT') ||
    read('APPWRITE_ENDPOINT') ||
    'https://cloud.appwrite.io/v1',
  appwriteProjectId:
    read('VITE_APPWRITE_PROJECT_ID') || read('APPWRITE_PROJECT_ID') || '',
  appwriteApiKey: read('APPWRITE_API_KEY'),
  databaseId: read('APPWRITE_DATABASE_ID'),
  postsTableId: read('APPWRITE_POSTS_COLLECTION_ID'),
  votesTableId: read('APPWRITE_VOTES_COLLECTION_ID'),
  commentsTableId: read('APPWRITE_COMMENTS_COLLECTION_ID'),
  baseUrl: read('VITE_BASE_URL') || 'http://localhost:3000',
}

export const QUALITY_THRESHOLDS = {
  MAX_SPAM_SCORE: 70,
  MIN_RELEVANCY_SCORE: 30,
  REQUIRE_ENHANCED: true,
} as const

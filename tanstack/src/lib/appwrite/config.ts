function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getAppwriteConfig() {
  return {
    endpoint: requireEnv("APPWRITE_ENDPOINT"),
    projectId: requireEnv("APPWRITE_PROJECT_ID"),
    apiKey: requireEnv("APPWRITE_API_KEY"),
    databaseId: requireEnv("APPWRITE_DATABASE_ID"),
    postsCollectionId: requireEnv("APPWRITE_POSTS_COLLECTION_ID"),
    votesCollectionId: process.env.APPWRITE_VOTES_COLLECTION_ID,
    commentsCollectionId: process.env.APPWRITE_COMMENTS_COLLECTION_ID,
    dailyTopicsCollectionId: process.env.APPWRITE_DAILY_TOPICS_COLLECTION_ID,
    topicsCollectionId: process.env.APPWRITE_TOPICS_COLLECTION_ID,
  }
}

export type AppwriteConfig = ReturnType<typeof getAppwriteConfig>

/**
 * Server-only configuration. Values are read at call time so the same build
 * works across environments (local `.env`, Appwrite Sites variables, …).
 *
 * The `NEXT_PUBLIC_*` names are still honoured so existing deployments and
 * Appwrite Functions (which share the same project variables) keep working.
 */

function read(...names: Array<string>): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return undefined
}

function required(...names: Array<string>): string {
  const value = read(...names)
  if (!value) {
    throw new Error(`Missing required environment variable: ${names.join(' or ')}`)
  }
  return value
}

export function getAppwriteConfig() {
  return {
    endpoint: required('APPWRITE_ENDPOINT', 'NEXT_PUBLIC_APPWRITE_ENDPOINT'),
    projectId: required('APPWRITE_PROJECT_ID', 'NEXT_PUBLIC_APPWRITE_PROJECT_ID'),
    apiKey: required('APPWRITE_API_KEY'),
  }
}

/** Safe to expose to the browser (used to build Appwrite Avatars URLs). */
export function getPublicConfig() {
  return {
    appwriteEndpoint: required('APPWRITE_ENDPOINT', 'NEXT_PUBLIC_APPWRITE_ENDPOINT').replace(/\/+$/, ''),
    appwriteProjectId: required('APPWRITE_PROJECT_ID', 'NEXT_PUBLIC_APPWRITE_PROJECT_ID'),
    /**
     * Appwrite Analytics property (public: ingestion is a public route). Empty
     * disables tracking and the visitor stats, which the server reads back.
     */
    analyticsPropertyId:
      read('APPWRITE_ANALYTICS_PROPERTY_ID', 'NEXT_PUBLIC_APPWRITE_ANALYTICS_PROPERTY_ID') ?? '',
    siteUrl: getSiteUrl(),
  }
}

/** Table IDs (env names keep the legacy `*_COLLECTION_ID` suffix). */
export function getTableIds() {
  return {
    databaseId: required('APPWRITE_DATABASE_ID'),
    posts: required('APPWRITE_POSTS_COLLECTION_ID'),
    comments: required('APPWRITE_COMMENTS_COLLECTION_ID'),
    votes: required('APPWRITE_VOTES_COLLECTION_ID'),
    dailyTopics: read('APPWRITE_DAILY_TOPICS_COLLECTION_ID') ?? 'daily_topics',
    channels: read('APPWRITE_CHANNELS_COLLECTION_ID') ?? 'channels',
    channelMembers: read('APPWRITE_CHANNEL_MEMBERS_COLLECTION_ID') ?? 'channel_members',
    profiles: read('APPWRITE_PROFILES_COLLECTION_ID') ?? 'profiles',
    follows: read('APPWRITE_FOLLOWS_COLLECTION_ID') ?? 'user_follows',
    blocks: read('APPWRITE_BLOCKS_COLLECTION_ID') ?? 'user_blocks',
    conversations: read('APPWRITE_CONVERSATIONS_COLLECTION_ID') ?? 'conversations',
    conversationMembers: read('APPWRITE_CONVERSATION_MEMBERS_COLLECTION_ID') ?? 'conversation_members',
    messages: read('APPWRITE_MESSAGES_COLLECTION_ID') ?? 'messages',
    messageReactions: read('APPWRITE_MESSAGE_REACTIONS_COLLECTION_ID') ?? 'message_reactions',
    notifications: read('APPWRITE_NOTIFICATIONS_COLLECTION_ID') ?? 'notifications',
    saves: read('APPWRITE_SAVES_COLLECTION_ID') ?? 'saves',
    reports: read('APPWRITE_REPORTS_COLLECTION_ID') ?? 'reports',
  }
}

/** Storage bucket IDs. */
export function getBucketIds() {
  return {
    channelIcons: read('APPWRITE_CHANNEL_ICONS_BUCKET_ID') ?? 'channel-icons',
  }
}

/** Canonical public origin, used for SEO metadata and social cards. */
export function getSiteUrl(): string {
  return (read('SITE_URL', 'NEXT_PUBLIC_BASE_URL', 'APP_BASE_URL') ?? 'https://refetch.io').replace(
    /\/+$/,
    '',
  )
}

/**
 * People who can review reports, besides accounts with the `moderator` or
 * `admin` label in Appwrite (read at sign-in). Comma-separated user IDs.
 */
export function getModeratorIds(): Set<string> {
  return new Set(
    (read('MODERATOR_USER_IDS') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  )
}

export const isProduction = process.env.NODE_ENV === 'production'

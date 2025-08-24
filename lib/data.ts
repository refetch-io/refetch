export interface Comment {
  id: string
  author: string
  text: string
  timeAgo: string
  count: number
  userId?: string
  parentId?: string // Add parentId to support nested comments
  replies?: Comment[]
  depth?: number // Add depth for visual nesting
}

export interface NewsItem {
  id: string
  title: string
  domain: string
  daysAgo?: string
  count: number
  iconName: string
  bgColorClass: string
  shapeClass: string
  extendedHighlight: string
  description?: string
  tldr?: string
  comments: Comment[]
  author: string
  userId?: string
  isSponsored?: boolean
  link?: string
  type?: string
  countComments?: number
  readingTime?: number
  spamScore?: number
  // Vote information
  currentVote?: 'up' | 'down' | null
}

// Appwrite post interface matching the collection structure
export interface AppwritePost {
  $id: string
  title: string
  description: string
  tldr?: string
  userId: string
  userName: string
  count: number
  countUp: number
  countDown: number
  countComments?: number
  link?: string
  type?: string
  readingTime?: number
  spamScore?: number
  timeScore?: number // Time-based score for ranking algorithm
  $createdAt: string
  $updatedAt: string
}

// Define a list of icon names to choose from
const availableIconNames = [
  "Globe",
  "Zap",
  "Lightbulb",
  "Rocket",
  "Cpu",
  "Cloud",
  "Database",
  "Code",
  "Terminal",
  "Server",
  "Shield",
  "Bug",
  "Atom",
  "Network",
  "Activity",
  "BarChart",
  "BookOpen",
  "Briefcase",
  "Calendar",
  "Camera",
  "Car",
  "Cast",
  "CheckCircle",
  "Chrome",
  "Circle",
  "Clipboard",
  "Clock",
  "Compass",
  "CreditCard",
  "Crosshair",
  "Crown",
  "Cube",
  "Dices",
  "Disc",
  "DollarSign",
  "Download",
  "Droplet",
  "Edit",
  "ExternalLink",
  "Eye",
  "Feather",
  "FileText",
  "Film",
  "Filter",
  "Flag",
  "Folder",
  "Frown",
  "Gift",
  "GitBranch",
  "GitCommit",
  "GitMerge",
  "GitPullRequest",
  "Github",
  "Globe2",
  "GraduationCap",
  "Grid",
  "HardDrive",
  "Hash",
  "Headphones",
  "Heart",
  "HelpCircle",
  "Home",
  "ImageIcon",
  "Inbox",
  "Info",
  "Key",
  "Laptop",
  "Layers",
  "Layout",
  "LifeBuoy",
  "Link",
  "List",
  "Loader",
  "Lock",
  "LogOut",
  "Mail",
  "Map",
  "Maximize",
  "Megaphone",
  "Menu",
  "MessageCircle",
  "Mic",
  "Minimize",
  "Monitor",
  "Moon",
  "MoreHorizontal",
  "MoreVertical",
  "Mountain",
  "MousePointer",
  "Move",
  "Music",
  "Navigation",
  "Newspaper",
  "Octagon",
  "Package",
  "Paperclip",
  "PauseCircle",
  "PenTool",
  "Percent",
  "Phone",
  "PieChart",
  "Pin",
  "PlayCircle",
  "Plus",
  "Pocket",
  "Power",
  "Printer",
  "Puzzle",
  "QrCode",
  "MessageCircleQuestionIcon",
  "Radio",
  "RefreshCw",
  "Repeat",
  "Reply",
  "Rewind",
  "Rss",
  "Save",
  "Scissors",
  "SearchIcon",
  "Send",
  "Settings",
  "Share2",
  "ShieldOff",
  "ShoppingCart",
  "Shuffle",
  "Sidebar",
  "SkipBack",
  "SkipForward",
  "Slack",
  "Sliders",
  "Smile",
  "Speaker",
  "Square",
  "Star",
  "StopCircle",
  "Sun",
  "Sunrise",
  "Sunset",
  "Tablet",
  "Tag",
  "Target",
  "Tent",
  "Thermometer",
  "ThumbsDown",
  "ThumbsUp",
  "Ticket",
  "Timer",
  "ToggleLeft",
  "ToggleRight",
  "Trash2",
  "TrendingDown",
  "TrendingUp",
  "Triangle",
  "Truck",
  "Tv",
  "Type",
  "Umbrella",
  "Unlock",
  "Upload",
  "User",
  "Users",
  "Verified",
  "Video",
  "Voicemail",
  "Volume",
  "Wallet",
  "Watch",
  "Wifi",
  "Wind",
  "X",
  "Youtube",
  "ZapOff",
  "ZoomIn",
  "ZoomOut",
]

// Define a list of background colors
const backgroundColors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
]

// Define a list of shapes (border-radius classes)
const shapes = ["rounded-full", "rounded-md", "rounded-none"]

// Improved time ago function
function getTimeAgo(createdAt: string): string {
  const created = new Date(createdAt)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - created.getTime())
  
  const seconds = Math.floor(diffTime / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (seconds < 1) {
    return "Just now"
  } else if (seconds < 60) {
    return seconds === 1 ? "1 second ago" : `${seconds} seconds ago`
  } else if (minutes < 60) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`
  } else if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`
  } else {
    return days === 1 ? "1 day ago" : `${days} days ago`
  }
}



// Helper function to convert Appwrite post to NewsItem
export const convertAppwritePostToNewsItem = (post: AppwritePost, index: number): NewsItem => {
  // Use the count field directly instead of calculating from countUp - countDown
  const domain = post.link ? new URL(post.link).hostname : "appwrite.io"
  
  // Use improved time ago function
  const timeAgo = getTimeAgo(post.$createdAt)

  return {
    id: post.$id,
    title: post.title,
    domain: domain,
    daysAgo: timeAgo,
    count: post.count,
    iconName: availableIconNames[index % availableIconNames.length],
    bgColorClass: backgroundColors[index % backgroundColors.length],
    shapeClass: shapes[index % shapes.length],
    extendedHighlight: post.description,
    description: post.description,
    tldr: post.tldr,
    comments: [], // We'll add comments later if needed
    author: post.userName,
    userId: post.userId,
    isSponsored: false,
    link: post.link,
    type: post.type,
    countComments: post.countComments || 0,
    readingTime: post.readingTime,
    spamScore: (post as any).spamScore,
  }
}

// Validate environment variables
function validateAppwriteConfig() {
  const missingVars = []
  
  if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) {
    missingVars.push('NEXT_PUBLIC_APPWRITE_ENDPOINT')
  }
  
  if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) {
    missingVars.push('NEXT_PUBLIC_APPWRITE_PROJECT_ID')
  }
  
  if (!process.env.APPWRITE_API_KEY) {
    missingVars.push('APPWRITE_API_KEY')
  }
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars.join(', '))
    return false
  }
  
  return true
}

// Server-side function to fetch posts from Appwrite (sorted by score)
export async function fetchPostsFromAppwrite(): Promise<{ posts: NewsItem[], error?: string }> {
  return fetchPostsFromAppwriteWithSort('score')
}

// Helper function to get timestamp for 24 hours ago
// This ensures old posts don't stick to the top of the feed and aligns with the algorithm's time decay logic
function getTwentyFourHoursAgo(): string {
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000))
  return twentyFourHoursAgo.toISOString()
}

// Server-side function to fetch posts from Appwrite with custom sorting
export async function fetchPostsFromAppwriteWithSort(sortType: 'score' | 'new' | 'show'): Promise<{ posts: NewsItem[], error?: string }> {
  if (!validateAppwriteConfig()) {
    console.warn('Appwrite configuration missing.')
    return { posts: [], error: 'Missing Appwrite configuration' }
  }

  try {
    const { Client, Databases, Query } = await import('node-appwrite')
    
    // Environment variables validated
    
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || 'dummy-api-key-replace-me')

    const databases = new Databases(client)
    
    let queries = []
    
    // Always filter posts to only show those from the last 24 hours
    const twentyFourHoursAgo = getTwentyFourHoursAgo()
    queries.push(Query.greaterThan('$createdAt', twentyFourHoursAgo))
    
    // Apply different sorting based on sortType
    switch (sortType) {
      case 'score':
        // Sort by count (total score) - highest first, then by creation date
        queries.push(Query.orderDesc('score'))
        queries.push(Query.orderDesc('$createdAt'))
        break
      case 'new':
        // Sort by creation date - newest first
        queries.push(Query.orderDesc('$createdAt'))
        break
      case 'show':
        // Filter by type=show, sort by count first, then by creation date
        queries.push(Query.equal('type', 'show'))
        queries.push(Query.orderDesc('score'))
        queries.push(Query.orderDesc('$createdAt'))
        break
    }
    
    // Add quality filters to ensure only high-quality, tech-relevant content appears
    // Filter out low-quality posts and non-tech content
    queries.push(Query.lessThan('spamScore', QUALITY_THRESHOLDS.MAX_SPAM_SCORE))
    queries.push(Query.greaterThan('relevancyScore', QUALITY_THRESHOLDS.MIN_RELEVANCY_SCORE))
    queries.push(Query.equal('enhanced', QUALITY_THRESHOLDS.REQUIRE_ENHANCED))
    
    // Select only the attributes we actually use to improve performance
    queries.push(Query.select([
      '$id',
      'title', 
      'description',
      'userId',
      'userName',
      'countUp',
      'countDown',
      'count',
      'countComments',
      'link',
      'type',
      'readingTime',
      'spamScore',
      '$createdAt',
      '$updatedAt'
    ]))
    
    const posts = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID || '', // Database ID
      process.env.APPWRITE_POSTS_COLLECTION_ID || '', // Collection ID
      queries
    )

    const appwritePosts = posts.documents.map((post: any) => ({
      $id: post.$id,
      title: post.title,
      description: post.description,
      userId: post.userId,
      userName: post.userName,
      countUp: post.countUp,
      countDown: post.countDown,
      count: post.count,
      countComments: post.countComments,
      link: post.link,
      type: post.type,
      readingTime: post.readingTime,
      spamScore: post.spamScore,
      relevancyScore: post.relevancyScore,
      $createdAt: post.$createdAt,
      $updatedAt: post.$updatedAt,
      currentVote: null as any
    }))

    return { posts: appwritePosts.map(post => convertAppwritePostToNewsItem(post as AppwritePost, 0)) }
  } catch (error) {
    console.error('Error fetching posts from Appwrite:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined
    })
    
    // Log additional debugging information
    if (error instanceof Error && error.message.includes('Appwrite')) {
      console.error('Appwrite-specific error detected')
    }
    
    return { posts: [], error: 'Failed to fetch posts from Appwrite' }
  }
}

// Quality filtering constants for post queries
const QUALITY_THRESHOLDS = {
  MAX_SPAM_SCORE: 70,        // Maximum allowed spam score (lower is better)
  MIN_RELEVANCY_SCORE: 30,   // Minimum required relevancy score for tech audience
  REQUIRE_ENHANCED: true     // Only show posts that have been processed by AI
}

// Comment fetching constants
const MAX_COMMENTS_PER_POST = 500

// Server-side function to fetch comments for a specific post
export async function fetchCommentsForPost(postId: string): Promise<Comment[]> {
  if (!validateAppwriteConfig()) {
    console.warn('Appwrite configuration missing for comments fetch.')
    return []
  }

  try {
    const { Client, Databases, Query } = await import('node-appwrite')
    
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || 'dummy-api-key-replace-me')

    const databases = new Databases(client)
    
    const comments = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID || '',
      process.env.APPWRITE_COMMENTS_COLLECTION_ID || '',
      [
        Query.equal('postId', postId),
        Query.orderDesc('$createdAt'),
        Query.limit(MAX_COMMENTS_PER_POST),
        // Select only the attributes we actually use to improve performance
        Query.select([
          '$id',
          'userName',
          'content',
          'userId',
          'count',
          'replyId', // Include replyId for nested comments
          '$createdAt'
        ])
      ]
    )

    // Transform the comments to match the Comment interface
    const flatComments = comments.documents.map(doc => ({
      id: doc.$id,
      author: doc.userName || 'Anonymous',
      text: doc.content || '',
      timeAgo: getTimeAgo(doc.$createdAt),
      count: doc.count || 0,
      userId: doc.userId || '',
      parentId: doc.replyId || undefined, // Use replyId as parentId
      replies: [],
      depth: 0
    }))

    // Build nested comment structure
    const nestedComments = buildNestedComments(flatComments)

    return nestedComments
  } catch (error) {
    console.error(`Error fetching comments for post ${postId}:`, error)
    return []
  }
}

// Helper function to build nested comment structure (same as API endpoint)
function buildNestedComments(flatComments: any[]): any[] {
  const commentMap = new Map()
  const rootComments: any[] = []

  // First pass: create a map of all comments
  flatComments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] })
  })

  // Second pass: build the tree structure naturally
  flatComments.forEach(comment => {
    if (comment.parentId && commentMap.has(comment.parentId)) {
      // This is a reply, add it to its parent
      const parent = commentMap.get(comment.parentId)
      parent.replies.push(commentMap.get(comment.id))
      // Set depth for visual nesting
      commentMap.get(comment.id).depth = (parent.depth || 0) + 1
    } else {
      // This is a root comment
      rootComments.push(commentMap.get(comment.id))
    }
  })

  // Sort replies by creation time (newest first)
  const sortReplies = (comments: any[]) => {
    comments.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.sort((a: any, b: any) => {
          // Sort by timeAgo (assuming newer comments come first in the original array)
          return flatComments.findIndex(c => c.id === a.id) - 
                 flatComments.findIndex(c => c.id === b.id)
        })
        sortReplies(comment.replies)
      }
    })
  }

  sortReplies(rootComments)
  return rootComments
}

export async function fetchPostById(id: string): Promise<NewsItem | null> {
  if (!validateAppwriteConfig()) {
    console.warn('Appwrite configuration missing.')
    return null
  }

  try {
    const { Client, Databases, Query } = await import('node-appwrite')
    
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || 'dummy-api-key-replace-me')

    const databases = new Databases(client)
    
    const post = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID || '', // Database ID
      process.env.APPWRITE_POSTS_COLLECTION_ID || '', // Collection ID
      id
    )

    // Convert the post to NewsItem format
    const newsItem = convertAppwritePostToNewsItem(post as unknown as AppwritePost, 0)
    
    // Fetch comments for this post
    const comments = await fetchCommentsForPost(id)
    newsItem.comments = comments

    return newsItem
  } catch (error) {
    console.error(`Error fetching post ${id} from Appwrite:`, error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined
    })
    
    // Log additional debugging information
    if (error instanceof Error && error.message.includes('Appwrite')) {
      console.error('Appwrite-specific error detected')
    }
    
    return null
  }
}

// Server-side function to fetch user submissions from Appwrite
export async function fetchUserSubmissionsFromAppwrite(userId: string): Promise<{ posts: NewsItem[], error?: string }> {
  if (!validateAppwriteConfig()) {
    console.warn('Appwrite configuration missing.')
    return { posts: [], error: 'Missing Appwrite configuration' }
  }

  try {
    const { Client, Databases, Query } = await import('node-appwrite')
    
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || 'dummy-api-key-replace-me')

    const databases = new Databases(client)
    
    const posts = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID || '', // Database ID
      process.env.APPWRITE_POSTS_COLLECTION_ID || '', // Collection ID
      [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
        // Select only the attributes we actually use to improve performance
        Query.select([
          '$id',
          'title', 
          'description',
          'userId',
          'userName',
          'countUp',
          'countDown',
          'count',
          'countComments',
          'link',
          'type',
          'readingTime',
          'spamScore',
          '$createdAt',
          '$updatedAt'
        ])
      ]
    )

    const appwritePosts = posts.documents.map((post: any, index: number) => 
      convertAppwritePostToNewsItem(post as AppwritePost, index)
    )

    return { posts: appwritePosts }
  } catch (error) {
    console.error('Error fetching user submissions from Appwrite:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined
    })
    
    return { posts: [], error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

// Function to fetch votes for multiple posts for a specific user
export async function fetchVotesForPosts(postIds: string[], userId: string): Promise<Map<string, 'up' | 'down' | null>> {
  if (!validateAppwriteConfig()) {
    console.warn('Appwrite configuration missing.')
    return new Map()
  }

  try {
    const { Client, Databases, Query } = await import('node-appwrite')
    
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || 'dummy-api-key-replace-me')

    const databases = new Databases(client)
    
    // Create a map of postId -> vote type
    const voteMap = new Map<string, 'up' | 'down' | null>()
    
    // Initialize all posts with null vote
    postIds.forEach(postId => {
      voteMap.set(postId, null)
    })
    
    if (postIds.length === 0) {
      return voteMap
    }

    // Fetch all votes for the user in a single query instead of individual queries
    try {
      const votes = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID || '', // Database ID
        process.env.APPWRITE_VOTES_COLLECTION_ID || '', // Votes Collection ID
        [
          Query.equal('userId', userId),
          Query.equal('resourceType', 'post'),
          Query.limit(100), // Limit to prevent too many results
          // Select only the attributes we actually use to improve performance
          Query.select([
            'resourceId',
            'count'
          ])
        ]
      )

      // Filter votes by the requested post IDs and set the vote types
      votes.documents.forEach((vote: any) => {
        const postId = vote.resourceId
        if (postIds.includes(postId)) {
          const voteType = vote.count === 1 ? 'up' : 'down'
          voteMap.set(postId, voteType)
        }
      })
    } catch (error) {
      console.error('Error fetching votes for posts:', error)
      // Continue with null votes if the query fails
    }

    return voteMap
  } catch (error) {
    console.error('Error fetching votes from Appwrite:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined
    })
    
    // Return empty map on error
    return new Map()
  }
}

// Updated function to fetch posts with vote information
export async function fetchPostsFromAppwriteWithVotes(userId?: string): Promise<{ posts: NewsItem[], error?: string }> {
  return fetchPostsFromAppwriteWithSortAndVotes('score', userId)
}

// Server-side function to fetch posts from Appwrite with custom sorting and vote information
export async function fetchPostsFromAppwriteWithSortAndVotes(
  sortType: 'score' | 'new' | 'show', 
  userId?: string,
  limit: number = 25,
  offset: number = 0
): Promise<{ posts: NewsItem[], error?: string }> {
  if (!validateAppwriteConfig()) {
    console.warn('Appwrite configuration missing.')
    return { posts: [], error: 'Missing Appwrite configuration' }
  }

  try {
    const { Client, Databases, Query } = await import('node-appwrite')
    
    // Environment variables validated
    
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || 'dummy-api-key-replace-me')

    const databases = new Databases(client)
    
    let queries = []
    
    // Always filter posts to only show those from the last 24 hours
    const twentyFourHoursAgo = getTwentyFourHoursAgo()
    queries.push(Query.greaterThan('$createdAt', twentyFourHoursAgo))
    
    // Add quality filters to ensure only high-quality, tech-relevant content appears
    // Filter out low-quality posts and non-tech content
    queries.push(Query.lessThan('spamScore', 70))        // Spam score must be less than 70 (lower is better)
    queries.push(Query.greaterThan('relevancyScore', 30)) // Must be at least somewhat relevant to tech audience
    queries.push(Query.equal('enhanced', true))           // Only show enhanced posts (processed by AI)
    
    // Apply different sorting based on sortType
    switch (sortType) {
      case 'score':
        // Sort by count (total score) - highest first, then by creation date
        queries.push(Query.orderDesc('score'))
        queries.push(Query.orderDesc('$createdAt'))
        break
      case 'new':
        // Sort by creation date - newest first
        queries.push(Query.orderDesc('$createdAt'))
        break
      case 'show':
        // Filter by type=show, sort by score first, then by creation date
        queries.push(Query.equal('type', 'show'))
        queries.push(Query.orderDesc('score'))
        queries.push(Query.orderDesc('$createdAt'))
        break
    }
    
    // Add pagination queries
    queries.push(Query.limit(limit))
    queries.push(Query.offset(offset))
    
    // Select only the attributes we actually use to improve performance
    queries.push(Query.select([
      '$id',
      'title', 
      'description',
      'userId',
      'userName',
      'countUp',
      'countDown',
      'count',
      'countComments',
      'link',
      'type',
      'readingTime',
      'spamScore',
      '$createdAt',
      '$updatedAt'
    ]))
    
    const posts = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID || '', // Database ID
      process.env.APPWRITE_POSTS_COLLECTION_ID || '', // Collection ID
      queries
    )

    const appwritePosts = posts.documents.map((post: any) => ({
      $id: post.$id,
      title: post.title,
      description: post.description,
      userId: post.userId,
      userName: post.userName,
      countUp: post.countUp,
      countDown: post.countDown,
      count: post.count,
      countComments: post.countComments,
      link: post.link,
      type: post.type,
      readingTime: post.readingTime,
      spamScore: post.spamScore,
      relevancyScore: post.relevancyScore,
      $createdAt: post.$createdAt,
      $updatedAt: post.$updatedAt,
      currentVote: null as any
    }))

    // Fetch votes for all posts if userId is provided
    if (userId && appwritePosts.length > 0) {
      const postIds = appwritePosts.map(post => post.$id)
      const voteMap = await fetchVotesForPosts(postIds, userId)
      
      // Add vote information to each post
      appwritePosts.forEach(post => {
        post.currentVote = voteMap.get(post.$id) || null
      })
    }

    return { posts: appwritePosts.map(post => convertAppwritePostToNewsItem(post as AppwritePost, 0)) }
  } catch (error) {
    console.error('Error fetching posts from Appwrite:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined
    })
    
    // Log additional debugging information
    if (error instanceof Error && error.message.includes('Appwrite')) {
      console.error('Appwrite-specific error detected')
    }
    
    return { posts: [], error: 'Failed to fetch posts from Appwrite' }
  }
}

// Updated function to fetch user submissions with vote information (no time limit)
export async function fetchUserSubmissionsFromAppwriteWithVotes(
  userId: string,
  limit: number = 25,
  offset: number = 0
): Promise<{ posts: NewsItem[], error?: string }> {
  if (!validateAppwriteConfig()) {
    console.warn('Appwrite configuration missing.')
    return { posts: [], error: 'Missing Appwrite configuration' }
  }

  try {
    const { Client, Databases, Query } = await import('node-appwrite')
    
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || 'dummy-api-key-replace-me')

    const databases = new Databases(client)
    
    const posts = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID || '', // Database ID
      process.env.APPWRITE_POSTS_COLLECTION_ID || '', // Collection ID
      [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
        Query.offset(offset),
        // Select only the attributes we actually use to improve performance
        Query.select([
          '$id',
          'title', 
          'description',
          'userId',
          'userName',
          'countUp',
          'countDown',
          'count',
          'countComments',
          'link',
          'type',
          'readingTime',
          'spamScore',
          '$createdAt',
          '$updatedAt'
        ])
      ]
    )

    const appwritePosts = posts.documents.map((post: any) => ({
      $id: post.$id,
      title: post.title,
      description: post.description,
      userId: post.userId,
      userName: post.userName,
      countUp: post.countUp,
      countDown: post.countDown,
      count: post.count,
      countComments: post.countComments,
      link: post.link,
      type: post.type,
      readingTime: post.readingTime,
      spamScore: post.spamScore,
      relevancyScore: post.relevancyScore,
      $createdAt: post.$createdAt,
      $updatedAt: post.$updatedAt,
      currentVote: null as any
    }))

    // Fetch votes for all posts
    if (appwritePosts.length > 0) {
      const postIds = appwritePosts.map(post => post.$id)
      const voteMap = await fetchVotesForPostsBatchServer(postIds, userId)
      
      // Add vote information to each post
      appwritePosts.forEach(post => {
        post.currentVote = voteMap.get(post.$id) || null
      })
    }

    return { posts: appwritePosts.map(post => convertAppwritePostToNewsItem(post as AppwritePost, 0)) }
  } catch (error) {
    console.error('Error fetching user submissions from Appwrite:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined
    })
    
    return { posts: [], error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

// New function to fetch comments for multiple posts in batch (server-side)
export async function fetchCommentsForPostsBatchServer(postIds: string[]): Promise<Record<string, Comment[]>> {
  if (!validateAppwriteConfig()) {
    console.warn('Appwrite configuration missing for batch comments fetch.')
    return {}
  }

  if (postIds.length === 0) {
    return {}
  }

  try {
    const { Client, Databases, Query } = await import('node-appwrite')
    
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || 'dummy-api-key-replace-me')

    const databases = new Databases(client)
    
    // Fetch comments for all posts in a single query
    const comments = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID || '',
      process.env.APPWRITE_COMMENTS_COLLECTION_ID || '',
      [
        Query.equal('postId', postIds), // This will match any of the post IDs
        Query.orderDesc('$createdAt'),
        Query.limit(1000), // Increase limit to get more comments
        // Select only the attributes we actually use to improve performance
        Query.select([
          'postId',
          'userName',
          'content',
          'userId',
          'count',
          '$createdAt'
        ])
      ]
    )

    // Group comments by postId
    const commentsByPost: Record<string, Comment[]> = {}
    postIds.forEach(postId => {
      commentsByPost[postId] = []
    })

    // Transform and group the comments
    comments.documents.forEach(doc => {
      const postId = doc.postId
      if (commentsByPost[postId]) {
        const transformedComment = {
          id: doc.$id,
          author: doc.userName || 'Anonymous',
          text: doc.content || '',
          timeAgo: getTimeAgo(doc.$createdAt),
          count: doc.count || 0, // Use the count field if available
          userId: doc.userId || '', // Include userId for original poster detection
          replies: [] // TODO: Implement nested replies using replyId
        }
        commentsByPost[postId].push(transformedComment)
      }
    })

    return commentsByPost
  } catch (error) {
    console.error('Error fetching batch comments from database:', error)
    return {}
  }
}

// Client-side function to fetch comments for multiple posts in batch
export async function fetchCommentsForPostsBatch(postIds: string[]): Promise<Record<string, Comment[]>> {
  if (!validateAppwriteConfig()) {
    console.warn('Appwrite configuration missing for batch comments fetch.')
    return {}
  }

  if (postIds.length === 0) {
    return {}
  }

  try {
    // Make a single POST API call to fetch comments for all posts
    // Using POST to avoid URL length issues with many post IDs
    const response = await fetch('/api/comments/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postIds })
    })
    
    if (!response.ok) {
      console.error('Failed to fetch batch comments:', response.status)
      // Fallback to individual fetching if batch fails
      return await fetchCommentsForPostsFallback(postIds)
    }

    const data = await response.json()
    return data.commentsByPost || {}
  } catch (error) {
    console.error('Error fetching batch comments:', error)
    // Fallback to individual fetching if batch fails
    return await fetchCommentsForPostsFallback(postIds)
  }
}

// Fallback function to fetch comments individually if batch fails
async function fetchCommentsForPostsFallback(postIds: string[]): Promise<Record<string, Comment[]>> {
  const commentsByPost: Record<string, Comment[]> = {}
  
  // Initialize empty arrays for all posts
  postIds.forEach(postId => {
    commentsByPost[postId] = []
  })
  
  // Fetch comments for each post individually as fallback
  for (const postId of postIds) {
    try {
      const comments = await fetchCommentsForPost(postId)
      commentsByPost[postId] = comments
    } catch (error) {
      console.error(`Error fetching comments for post ${postId}:`, error)
      commentsByPost[postId] = []
    }
  }
  
  return commentsByPost
}

// New function to fetch votes for multiple posts in batch (server-side)
export async function fetchVotesForPostsBatchServer(postIds: string[], userId: string): Promise<Map<string, 'up' | 'down' | null>> {
  if (!validateAppwriteConfig()) {
    console.warn('Appwrite configuration missing.')
    return new Map()
  }

  try {
    const { Client, Databases, Query } = await import('node-appwrite')
    
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || 'dummy-api-key-replace-me')

    const databases = new Databases(client)
    
    // Create a map of postId -> vote type
    const voteMap = new Map<string, 'up' | 'down' | null>()
    
    // Initialize all posts with null vote
    postIds.forEach(postId => {
      voteMap.set(postId, null)
    })
    
    if (postIds.length === 0) {
      return voteMap
    }

    // Fetch all votes for the user in a single query instead of individual queries
    try {
      const votes = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID || '', // Database ID
        process.env.APPWRITE_VOTES_COLLECTION_ID || '', // Votes Collection ID
        [
          Query.equal('userId', userId),
          Query.equal('resourceType', 'post'),
          Query.limit(100), // Limit to prevent too many results
          // Select only the attributes we actually use to improve performance
          Query.select([
            'resourceId',
            'count'
          ])
        ]
      )

      // Filter votes by the requested post IDs and set the vote types
      votes.documents.forEach((vote: any) => {
        const postId = vote.resourceId
        if (postIds.includes(postId)) {
          const voteType = vote.count === 1 ? 'up' : 'down'
          voteMap.set(postId, voteType)
        }
      })
    } catch (error) {
      console.error('Error fetching votes for posts:', error)
      // Continue with null votes if the query fails
    }

    return voteMap
  } catch (error) {
    console.error('Error fetching votes from Appwrite:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined
    })
    
    // Return empty map on error
    return new Map()
  }
}

// Updated function to fetch posts with comments in batch
export async function fetchPostsFromAppwriteWithCommentsAndVotes(
  sortType: 'score' | 'new' | 'show' = 'score', 
  userId?: string,
  limit: number = 25,
  offset: number = 0
): Promise<{ posts: NewsItem[], error?: string }> {
  if (!validateAppwriteConfig()) {
    console.warn('Appwrite configuration missing.')
    return { posts: [], error: 'Missing Appwrite configuration' }
  }

  try {
    const { Client, Databases, Query } = await import('node-appwrite')
    
    // Environment variables validated
    
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || 'dummy-api-key-replace-me')

    const databases = new Databases(client)
    
    let queries = []
    
    // Always filter posts to only show those from the last 24 hours
    const twentyFourHoursAgo = getTwentyFourHoursAgo()
    queries.push(Query.greaterThan('$createdAt', twentyFourHoursAgo))
    
    // Add quality filters to ensure only high-quality, tech-relevant content appears
    // Filter out low-quality posts and non-tech content
    queries.push(Query.lessThan('spamScore', 70))        // Spam score must be less than 70 (lower is better)
    queries.push(Query.greaterThan('relevancyScore', 30)) // Must be at least somewhat relevant to tech audience
    queries.push(Query.equal('enhanced', true))           // Only show enhanced posts (processed by AI)
    
    // Apply different sorting based on sortType
    switch (sortType) {
      case 'score':
        // Sort by count (total score) - highest first, then by creation date
        queries.push(Query.orderDesc('score'))
        queries.push(Query.orderDesc('$createdAt'))
        break
      case 'new':
        // Sort by creation date - newest first
        queries.push(Query.orderDesc('$createdAt'))
        break
      case 'show':
        // Filter by type=show, sort by score first, then by creation date
        queries.push(Query.equal('type', 'show'))
        queries.push(Query.orderDesc('score'))
        queries.push(Query.orderDesc('$createdAt'))
        break
    }
    
    // Add pagination queries
    queries.push(Query.limit(limit))
    queries.push(Query.offset(offset))
    
    // Select only the attributes we actually use to improve performance
    queries.push(Query.select([
      '$id',
      'title', 
      'description',
      'userId',
      'userName',
      'countUp',
      'countDown',
      'count',
      'countComments',
      'link',
      'type',
      'readingTime',
      'spamScore',
      '$createdAt',
      '$updatedAt'
    ]))
    
    const posts = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID || '', // Database ID
      process.env.APPWRITE_POSTS_COLLECTION_ID || '', // Collection ID
      queries
    )

    const appwritePosts = posts.documents.map((post: any) => ({
      $id: post.$id,
      title: post.title,
      description: post.description,
      userId: post.userId,
      userName: post.userName,
      countUp: post.countUp,
      countDown: post.countDown,
      count: post.count,
      countComments: post.countComments,
      link: post.link,
      type: post.type,
      readingTime: post.readingTime,
      spamScore: post.spamScore,
      relevancyScore: post.relevancyScore,
      $createdAt: post.$createdAt,
      $updatedAt: post.$updatedAt,
      currentVote: null as any
    }))

    // Fetch votes for all posts if userId is provided
    if (userId && appwritePosts.length > 0) {
      const postIds = appwritePosts.map(post => post.$id)
      const voteMap = await fetchVotesForPostsBatchServer(postIds, userId)
      
      // Add vote information to each post
      appwritePosts.forEach(post => {
        post.currentVote = voteMap.get(post.$id) || null
      })
    }

    // Fetch comments for all posts in batch
    let commentsByPost: Record<string, Comment[]> = {}
    if (appwritePosts.length > 0) {
      const postIds = appwritePosts.map(post => post.$id)
      commentsByPost = await fetchCommentsForPostsBatchServer(postIds)
    }

    // Convert to NewsItem format and add comments
    const newsItems = appwritePosts.map(post => {
      const newsItem = convertAppwritePostToNewsItem(post as AppwritePost, 0)
      // Add comments if available
      if (commentsByPost[post.$id]) {
        newsItem.comments = commentsByPost[post.$id]
      }
      return newsItem
    })

    return { posts: newsItems }
  } catch (error) {
    console.error('Error fetching posts from Appwrite:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined
    })
    
    // Log additional debugging information
    if (error instanceof Error && error.message.includes('Appwrite')) {
      console.error('Appwrite-specific error detected')
    }
    
    return { posts: [], error: 'Failed to fetch posts from Appwrite' }
  }
}

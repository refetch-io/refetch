export interface Comment {
  id: string
  author: string
  text: string
  timeAgo: string
  score: number
  replies?: Comment[]
}

export interface NewsItem {
  id: string
  title: string
  domain: string
  daysAgo?: string
  score: number
  iconName: string
  bgColorClass: string
  shapeClass: string
  extendedHighlight: string
  description?: string
  comments: Comment[]
  author: string
  isSponsored?: boolean
  link?: string
  type?: string
  countComments?: number
  // Vote information
  currentVote?: 'up' | 'down' | null
}

// Appwrite post interface matching the collection structure
export interface AppwritePost {
  $id: string
  title: string
  description: string
  userId: string
  userName: string
  count: number
  countUp: number
  countDown: number
  countComments?: number
  link?: string
  type?: string
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
  const score = post.count || 0
  const domain = post.link ? new URL(post.link).hostname : "appwrite.io"
  
  // Use improved time ago function
  const timeAgo = getTimeAgo(post.$createdAt)

  return {
    id: post.$id,
    title: post.title,
    domain: domain,
    daysAgo: timeAgo,
    score: score,
    iconName: availableIconNames[index % availableIconNames.length],
    bgColorClass: backgroundColors[index % backgroundColors.length],
    shapeClass: shapes[index % shapes.length],
    extendedHighlight: post.description,
    description: post.description,
    comments: [], // We'll add comments later if needed
    author: post.userName,
    isSponsored: false,
    link: post.link,
    type: post.type,
    countComments: post.countComments || 0,
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

// Server-side function to fetch posts from Appwrite with custom sorting
export async function fetchPostsFromAppwriteWithSort(sortType: 'score' | 'new' | 'show'): Promise<{ posts: NewsItem[], error?: string }> {
  if (!validateAppwriteConfig()) {
    console.warn('Appwrite configuration missing.')
    return { posts: [], error: 'Missing Appwrite configuration' }
  }

  try {
    const { Client, Databases, Query } = await import('node-appwrite')
    
    // Log environment variables for debugging (remove sensitive data in production)
    console.log('Appwrite Config:', {
      endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ? 'Set' : 'Missing',
      projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ? 'Set' : 'Missing',
      apiKey: process.env.APPWRITE_API_KEY ? 'Set' : 'Missing'
    })
    
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || 'dummy-api-key-replace-me')

    const databases = new Databases(client)
    
    let queries = []
    
    // Apply different sorting based on sortType
    switch (sortType) {
      case 'score':
        // Sort by count (total score) - highest first, then by creation date
        queries = [
          Query.orderDesc('count'),
          Query.orderDesc('$createdAt')
        ]
        break
      case 'new':
        // Sort by creation date - newest first
        queries = [
          Query.orderDesc('$createdAt')
        ]
        break
      case 'show':
        // Filter by type=show, sort by count first, then by creation date
        queries = [
          Query.equal('type', 'show'),
          Query.orderDesc('count'),
          Query.orderDesc('$createdAt')
        ]
        break
    }
    
    const posts = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID || '', // Database ID
      process.env.APPWRITE_POSTS_COLLECTION_ID || '', // Collection ID
      queries
    )

    console.log(`Successfully fetched ${posts.documents.length} posts from Appwrite with sort type: ${sortType}`)

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
    console.error('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
      projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
      hasApiKey: !!process.env.APPWRITE_API_KEY
    })
    
    return { posts: [], error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

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
        Query.orderDesc('$createdAt')
      ]
    )

    // Transform the comments to match the Comment interface
    const transformedComments = comments.documents.map(doc => ({
      id: doc.$id,
      author: doc.userName || 'Anonymous',
      text: doc.content || '',
      timeAgo: getTimeAgo(doc.$createdAt),
      score: 0, // Default score since it's not stored in the collection
      replies: [] // TODO: Implement nested replies using replyId
    }))

    return transformedComments
  } catch (error) {
    console.error(`Error fetching comments for post ${postId}:`, error)
    return []
  }
}

export async function fetchPostById(id: string): Promise<NewsItem | null> {
  if (!validateAppwriteConfig()) {
    console.warn('Appwrite configuration missing.')
    return null
  }

  try {
    const { Client, Databases } = await import('node-appwrite')
    
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

    console.log(`Successfully fetched post ${id} from Appwrite`)

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
    console.error('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
      projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
      hasApiKey: !!process.env.APPWRITE_API_KEY
    })
    
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
        Query.orderDesc('$createdAt')
      ]
    )

    console.log(`Successfully fetched ${posts.documents.length} user submissions from Appwrite for user ${userId}`)

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
    
    // Fetch votes for each post ID individually since Appwrite doesn't support OR queries easily
    for (const postId of postIds) {
      try {
        const votes = await databases.listDocuments(
          process.env.APPWRITE_DATABASE_ID || '', // Database ID
          process.env.APPWRITE_VOTES_COLLECTION_ID || '', // Votes Collection ID
          [
            Query.equal('postId', postId),
            Query.equal('userId', userId)
          ]
        )

        // Set the vote if found
        if (votes.documents.length > 0) {
          const vote = votes.documents[0]
          const voteType = vote.count === 1 ? 'up' : 'down'
          voteMap.set(postId, voteType)
        }
      } catch (error) {
        console.error(`Error fetching votes for post ${postId}:`, error)
        // Continue with other posts even if one fails
      }
    }

    console.log(`Successfully fetched votes for ${postIds.length} posts for user ${userId}`)

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

// Updated function to fetch posts with custom sorting and vote information
export async function fetchPostsFromAppwriteWithSortAndVotes(sortType: 'score' | 'new' | 'show', userId?: string): Promise<{ posts: NewsItem[], error?: string }> {
  if (!validateAppwriteConfig()) {
    console.warn('Appwrite configuration missing.')
    return { posts: [], error: 'Missing Appwrite configuration' }
  }

  try {
    const { Client, Databases, Query } = await import('node-appwrite')
    
    // Log environment variables for debugging (remove sensitive data in production)
    console.log('Appwrite Config:', {
      endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ? 'Set' : 'Missing',
      projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ? 'Set' : 'Missing',
      apiKey: process.env.APPWRITE_API_KEY ? 'Set' : 'Missing'
    })
    
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || 'dummy-api-key-replace-me')

    const databases = new Databases(client)
    
    let queries = []
    
    // Apply different sorting based on sortType
    switch (sortType) {
      case 'score':
        // Sort by count (total score) - highest first, then by creation date
        queries = [
          Query.orderDesc('count'),
          Query.orderDesc('$createdAt')
        ]
        break
      case 'new':
        // Sort by creation date - newest first
        queries = [
          Query.orderDesc('$createdAt')
        ]
        break
      case 'show':
        // Filter by type=show, sort by score first, then by creation date
        queries = [
          Query.equal('type', 'show'),
          Query.orderDesc('count'),
          Query.orderDesc('$createdAt')
        ]
        break
    }
    
    const posts = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID || '', // Database ID
      process.env.APPWRITE_POSTS_COLLECTION_ID || '', // Collection ID
      queries
    )

    console.log(`Successfully fetched ${posts.documents.length} posts from Appwrite with sort type: ${sortType}`)

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
    console.error('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
      projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
      hasApiKey: !!process.env.APPWRITE_API_KEY
    })
    
    return { posts: [], error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

// Updated function to fetch user submissions with vote information
export async function fetchUserSubmissionsFromAppwriteWithVotes(userId: string): Promise<{ posts: NewsItem[], error?: string }> {
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
        Query.orderDesc('$createdAt')
      ]
    )

    console.log(`Successfully fetched ${posts.documents.length} user submissions from Appwrite for user ${userId}`)

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
      $createdAt: post.$createdAt,
      $updatedAt: post.$updatedAt,
      currentVote: null as any
    }))

    // Fetch votes for all posts
    if (appwritePosts.length > 0) {
      const postIds = appwritePosts.map(post => post.$id)
      const voteMap = await fetchVotesForPosts(postIds, userId)
      
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

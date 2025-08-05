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
  comments: Comment[]
  author: string
  isSponsored?: boolean
  link?: string
  type?: string
}

// Appwrite post interface matching the collection structure
export interface AppwritePost {
  $id: string
  title: string
  description: string
  userId: string
  userName: string
  countUp: number
  countDown: number
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
  
  if (seconds < 60) {
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
const convertAppwritePostToNewsItem = (post: AppwritePost, index: number): NewsItem => {
  const score = post.countUp - post.countDown
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
    comments: [], // We'll add comments later if needed
    author: post.userName,
    isSponsored: false,
    link: post.link,
    type: post.type,
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

// Server-side function to fetch posts from Appwrite
export async function fetchPostsFromAppwrite(): Promise<NewsItem[]> {
  if (!validateAppwriteConfig()) {
    console.warn('Appwrite configuration missing.')
    return []
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
    
    const posts = await databases.listDocuments(
      '688f787e002c78bd299f', // Database ID
      '688f78a20022f61836ff', // Collection ID
      [
        Query.orderDesc('countUp'), // Sort by upvotes count, highest first
        Query.orderDesc('$createdAt') // Then by creation date, newest first
      ]
    )

    console.log(`Successfully fetched ${posts.documents.length} posts from Appwrite`)

    const appwritePosts = posts.documents.map((post: any, index: number) => 
      convertAppwritePostToNewsItem(post as AppwritePost, index)
    )

    return appwritePosts
  } catch (error) {
    console.error('Error fetching posts from Appwrite:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return []
  }
}

// Server-side function to fetch a single post by ID from Appwrite
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
      '688f787e002c78bd299f', // Database ID
      '688f78a20022f61836ff', // Collection ID
      id
    )

    console.log(`Successfully fetched post ${id} from Appwrite`)

    return convertAppwritePostToNewsItem(post as unknown as AppwritePost, 0)
  } catch (error) {
    console.error(`Error fetching post ${id} from Appwrite:`, error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return null
  }
}

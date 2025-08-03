import type { LucideIcon } from "lucide-react"
import {
  Globe,
  Zap,
  Lightbulb,
  Rocket,
  Cpu,
  Cloud,
  Database,
  Code,
  Terminal,
  Server,
  Shield,
  Bug,
  Atom,
  Network,
  Activity,
  BarChart,
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  Car,
  Cast,
  CheckCircle,
  Chrome,
  Circle,
  Clipboard,
  Clock,
  Compass,
  CreditCard,
  Crosshair,
  Crown,
  CuboidIcon as Cube,
  Dices,
  Disc,
  DollarSign,
  Download,
  Droplet,
  Edit,
  ExternalLink,
  Eye,
  Feather,
  FileText,
  Film,
  Filter,
  Flag,
  Folder,
  Frown,
  Gift,
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Github,
  Globe2,
  GraduationCap,
  Grid,
  HardDrive,
  Hash,
  Headphones,
  Heart,
  HelpCircle,
  Home,
  ImageIcon,
  Inbox,
  Info,
  Key,
  Laptop,
  Layers,
  Layout,
  LifeBuoy,
  Link,
  List,
  Loader,
  Lock,
  LogOut,
  Mail,
  Map,
  Maximize,
  Megaphone,
  Menu,
  MessageCircle,
  Mic,
  Minimize,
  Monitor,
  Moon,
  MoreHorizontal,
  MoreVertical,
  Mountain,
  MousePointer,
  Move,
  Music,
  Navigation,
  Newspaper,
  Octagon,
  Package,
  Paperclip,
  PauseCircle,
  PenTool,
  Percent,
  Phone,
  PieChart,
  Pin,
  PlayCircle,
  Plus,
  Pocket,
  Power,
  Printer,
  Puzzle,
  QrCode,
  MessageCircleQuestionIcon,
  Radio,
  RefreshCw,
  Repeat,
  Reply,
  Rewind,
  Rss,
  Save,
  Scissors,
  SearchIcon,
  Send,
  Settings,
  Share2,
  ShieldOff,
  ShoppingCart,
  Shuffle,
  Sidebar,
  SkipBack,
  SkipForward,
  Slack,
  Sliders,
  Smile,
  Speaker,
  Square,
  Star,
  StopCircle,
  Sun,
  Sunrise,
  Sunset,
  Tablet,
  Tag,
  Target,
  Tent,
  Thermometer,
  ThumbsDown,
  ThumbsUp,
  Ticket,
  Timer,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingDown,
  TrendingUp,
  Triangle,
  Truck,
  Tv,
  Type,
  Umbrella,
  Unlock,
  Upload,
  User,
  Users,
  Verified,
  Video,
  Voicemail,
  Volume,
  Wallet,
  Watch,
  Wifi,
  Wind,
  X,
  Youtube,
  ZapOff,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

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
  iconName: string // Changed from icon: LucideIcon to iconName: string
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

const techTitles = [
  // Appwrite Blog Articles
  "Building a Real-Time Chat App with Appwrite and React",
  "How to Implement User Authentication with Appwrite",
  "Creating a File Upload System with Appwrite Storage",
  "Building a Todo App with Appwrite and Next.js",
  "Implementing Real-Time Notifications with Appwrite",
  "How to Use Appwrite Functions for Serverless Backend",
  "Building a Social Media App with Appwrite and Flutter",
  "Creating a Blog Platform with Appwrite and Vue.js",
  "Implementing Database Relationships in Appwrite",
  "Building an E-commerce App with Appwrite and React Native",
  "How to Set Up Appwrite Security Rules",
  "Creating a Real-Time Dashboard with Appwrite",
  "Building a Multi-tenant Application with Appwrite",
  "Implementing Search and Filtering with Appwrite",
  "How to Deploy Appwrite on Your Own Server",
  "Building a Video Streaming App with Appwrite",
  "Creating a Real-Time Collaborative Editor",
  "Implementing Push Notifications with Appwrite",
  "Building a Mobile App with Appwrite and Ionic",
  "How to Optimize Appwrite Database Performance",
  "Creating a Real-Time Analytics Dashboard",
  "Building a Marketplace with Appwrite and Angular",
  "Implementing OAuth Authentication with Appwrite",
  "Creating a Real-Time Gaming Platform",
  "Building a Content Management System with Appwrite",
  // Original Tech Articles
  "Microsoft Announces Major Updates to Azure Cloud Services",
  "OpenAI's Latest GPT Model Shows Enhanced Reasoning Capabilities",
  "Cybersecurity Firm Discovers New Zero-Day Vulnerability",
  "The Impact of Edge Computing on IoT Devices",
  "Decentralized Finance (DeFi) Continues Rapid Growth",
  "New Battery Technology Promises Longer EV Range",
  "How Blockchain is Revolutionizing Supply Chain Management",
  "The Future of VR/AR: Beyond Gaming and Entertainment",
  "Advancements in Robotics: From Industrial to Domestic Use",
  "SpaceX Achieves New Milestone in Reusable Rocket Technology",
  "Deep Learning Techniques for Medical Image Analysis",
  "The Evolution of 5G and Its Role in Smart Cities",
  "Next-Gen Processors: Faster, More Efficient, and AI-Powered",
  "Sustainable Tech: Innovations in Green Energy Solutions",
  "The Role of Data Science in Predicting Consumer Behavior",
  "Exploring Quantum Machine Learning Algorithms",
  "The Ethics of AI in Autonomous Vehicles",
  "Building Scalable Microservices with Kubernetes",
  "Server-Side Rendering vs. Client-Side Rendering in React",
  "Optimizing Database Performance for High-Traffic Applications",
  "The Rise of Low-Code/No-Code Platforms in Enterprise",
  "Understanding Web3 and the Decentralized Web",
  "New Innovations in Renewable Energy Storage",
  "The Role of AI in Personalized Healthcare",
  "Advancements in Computer Vision for Robotics",
]

const sponsoredTitles = [
  "Boost Your Productivity with Our New AI Tool",
  "Learn to Code Faster with Interactive Tutorials",
  "Secure Your Data: Top Cybersecurity Solutions",
  "Unlock Cloud Potential with Our Managed Services",
  "Invest in the Future: Decentralized Finance Platform",
]

const generateExtendedHighlight = (title: string) => {
  return `This article, "${title}", delves deep into the latest advancements and implications of its core subject. It provides a comprehensive overview, exploring both the opportunities and challenges presented by this rapidly evolving field. Experts weigh in on future trends, offering valuable insights for professionals and enthusiasts alike. The piece highlights key innovations, discusses their potential impact on various industries, and offers a nuanced perspective on the ethical considerations involved. A must-read for anyone looking to stay informed on cutting-edge developments.`
}

// Helper to generate a deterministic comment with replies
const generateRandomComment = (depth = 0, seed: number): Comment => {
  const authors = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"]
  const texts = [
    "Great article! Very insightful.",
    "I learned a lot from this. Thanks!",
    "Interesting perspective, but I disagree on point X.",
    "Can you elaborate on the data sources?",
    "This is a game-changer!",
    "I'm not sure I fully grasp this concept.",
    "Looking forward to more content like this.",
    "Any thoughts on the ethical implications?",
  ]
  const timeAgoes = ["just now", "2 hours ago", "5 hours ago", "1 day ago", "2 days ago", "1 week ago"]

  // Simple deterministic random function
  const seededRandom = (max: number) => {
    const x = Math.sin(seed) * 10000
    return Math.floor((x - Math.floor(x)) * max)
  }

  const comment: Comment = {
    id: `c${seed}-${depth}`,
    author: authors[seededRandom(authors.length)],
    text: texts[seededRandom(texts.length)],
    timeAgo: timeAgoes[seededRandom(timeAgoes.length)],
    score: seededRandom(50) - 10, // Scores can be negative
  }

  if (depth < 2 && seededRandom(2) > 0) {
    // Max 2 levels of replies for simplicity
    const numReplies = seededRandom(3) // 0-2 replies
    comment.replies = Array.from({ length: numReplies }, (_, i) => generateRandomComment(depth + 1, seed + i + 1))
  }

  return comment
}

const generateSponsoredItem = (index: number): NewsItem => {
  const title = sponsoredTitles[index % sponsoredTitles.length]
  return {
    id: `sponsored-${index}`,
    title: title,
    domain: "sponsor.com", // A generic domain for sponsored content
    daysAgo: "Ad", // Indicate it's an ad
    score: 0, // Sponsored items don't have a score in this context
    iconName: "Rocket", // A generic icon for sponsored content
    bgColorClass: "bg-gray-700", // A distinct background color for sponsored items
    shapeClass: "rounded-md",
    extendedHighlight: `This is a sponsored message: ${title}. Click to learn more about how this product can help you.`,
    comments: [], // No comments for sponsored items
    author: "Sponsored Content",
    isSponsored: true,
  }
}

// Helper function to convert Appwrite post to NewsItem
const convertAppwritePostToNewsItem = (post: AppwritePost, index: number): NewsItem => {
  const score = post.countUp - post.countDown
  const domain = post.link ? new URL(post.link).hostname : "appwrite.io"
  
  // Calculate days ago from createdAt
  const createdAt = new Date(post.$createdAt)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - createdAt.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const daysAgo = diffDays === 1 ? "1 day ago" : `${diffDays} days ago`

  return {
    id: post.$id,
    title: post.title,
    domain: domain,
    daysAgo: daysAgo,
    score: score,
    iconName: availableIconNames[index % availableIconNames.length], // Use string instead of component
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

// Server-side function to fetch posts from Appwrite
export async function fetchPostsFromAppwrite(): Promise<NewsItem[]> {
  try {
    const { Client, Databases, Query } = await import('node-appwrite')
    
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || 'dummy-api-key-replace-me') // Dummy key for now

    const databases = new Databases(client)
    
    const posts = await databases.listDocuments(
      '688f787e002c78bd299f', // Database ID
      '688f78a20022f61836ff', // Collection ID
      [
        Query.orderDesc('$createdAt') // Sort by creation date, oldest first
      ]
    )

    const appwritePosts = posts.documents.map((post: any, index: number) => 
      convertAppwritePostToNewsItem(post as AppwritePost, index)
    )

    // If no posts found, return empty array (will fallback to dummy data)
    if (appwritePosts.length === 0) {
      console.log('No posts found in Appwrite, will use dummy data')
      return []
    }

    return appwritePosts
  } catch (error) {
    console.error('Error fetching posts from Appwrite:', error)
    // Return empty array if there's an error (will fallback to dummy data)
    return []
  }
}

export const allNewsItems: NewsItem[] = Array.from({ length: 1000 }, (_, i) => {
  if ((i + 1) % 5 === 0) {
    // Every 5th item is sponsored
    return generateSponsoredItem(i)
  } else {
    // Simple deterministic random function
    const seededRandom = (max: number, seed: number) => {
      const x = Math.sin(seed) * 10000
      return Math.floor((x - Math.floor(x)) * max)
    }

    const authors = ["sarah_dev", "mike_tech", "alex_coder", "emma_ai", "david_cloud", "lisa_web", "james_data", "maria_sec", "tom_ops", "rachel_ux"]
    
    return {
      id: `${i + 1}`,
      title: techTitles[seededRandom(techTitles.length, i)],
      domain: ["appwrite.io", "bbc.co.uk", "techcrunch.com", "github.com", "stackoverflow.com", "theverge.com", "arstechnica.com"][
        seededRandom(7, i + 1000)
      ],
      daysAgo: `${seededRandom(30, i + 2000)} days ago`,
      score: seededRandom(1000, i + 3000) + 1,
      iconName: availableIconNames[seededRandom(availableIconNames.length, i + 4000)],
      bgColorClass: backgroundColors[seededRandom(backgroundColors.length, i + 5000)],
      shapeClass: shapes[seededRandom(shapes.length, i + 6000)],
      extendedHighlight: generateExtendedHighlight(techTitles[seededRandom(techTitles.length, i + 7000)]),
      comments: Array.from({ length: seededRandom(5, i + 8000) + 1 }, (_, j) => generateRandomComment(0, i * 1000 + j)),
      author: authors[seededRandom(authors.length, i + 9000)],
      isSponsored: false, // Explicitly mark as not sponsored
    }
  }
})

export function getArticleById(id: string): NewsItem | undefined {
  return allNewsItems.find((item) => item.id === id)
}

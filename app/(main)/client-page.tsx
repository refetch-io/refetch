"use client"
import { useState, useEffect, useMemo } from "react"
import { RightSidebar } from "@/components/right-sidebar"
import { StoriesCarousel } from "@/components/stories-carousel"
import { type NewsItem } from "@/lib/data"
import { handleVote, fetchUserVotesForResources } from "@/lib/voteHandler"
import { type VoteState } from "@/lib/types"
import { SponsoredAd } from "@/components/sponsored-ad"
import { SearchAndFilter } from "@/components/search-and-filter"
import { useAuth } from "@/contexts/auth-context"
import { getCachedJWT } from "@/lib/jwtCache"
import { PostCard } from "@/components/post-card"
import { Pagination } from "@/components/pagination"

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
  Link as LinkIcon,
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



// Icon mapping object
const iconMap: { [key: string]: any } = {
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
  Cube,
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
  Link: LinkIcon,
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
}

// Helper function to get icon component from name
const getIconComponent = (iconName: string) => {
  return iconMap[iconName] || Globe // Fallback to Globe if icon not found
}

// Helper function to clean domain for display (remove www prefix)
const cleanDomainForDisplay = (domain: string) => {
  return domain.replace(/^www\./, '')
}

// Rotating ad copy component
function RotatingAdCopy() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isClient, setIsClient] = useState(false)
  
  const adCopies = [
    {
      logoUrl: "https://appwrite.io/images/logos/logo.svg",
      logoAlt: "Appwrite Logo",
      title: "Appwrite Cloud",
      description: "Build faster with our fully managed backend platform.",
      linkUrl: "https://appwrite.io"
    },
    {
      logoUrl: "https://imagine.dev/favicon.png",
      logoAlt: "Imagine Logo", 
      title: "Imagine",
      description: "Build faster with our fullstack vibe coding platform.",
      linkUrl: "https://imagine.dev"
    }
  ]

  useEffect(() => {
    setIsClient(true)
    setCurrentIndex(Math.floor(Math.random() * 2))
  }, [])

  const currentAd = adCopies[currentIndex]

  return (
    <SponsoredAd
      logoUrl={currentAd.logoUrl}
      logoAlt={currentAd.logoAlt}
      title={currentAd.title}
      description={currentAd.description}
      linkUrl={currentAd.linkUrl}
    />
  )
}

interface ClientPageProps {
  initialPosts: NewsItem[]
  error?: string
  sortType?: 'score' | 'new' | 'show'
  userId?: string
}

export function ClientPage({ initialPosts, error, sortType = 'score', userId }: ClientPageProps) {
  const [newsItems, setNewsItems] = useState<NewsItem[]>(initialPosts)
  const [voteStates, setVoteStates] = useState<Record<string, VoteState>>({})
  const [votingItems, setVotingItems] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const { user, isAuthenticated } = useAuth()

  const POSTS_PER_PAGE = 25
  const MAX_PAGES = 10

  // Update newsItems when initialPosts changes
  useEffect(() => {
    setNewsItems(initialPosts)
    setCurrentPage(1)
  }, [initialPosts])

  // Fetch posts for a specific page
  const fetchPostsForPage = async (page: number) => {
    if (page < 1 || page > MAX_PAGES) return
    
    try {
      const offset = (page - 1) * POSTS_PER_PAGE
      
      let response
      if (userId) {
        // For user submissions (mines page)
        const jwt = await getCachedJWT()
        response = await fetch(`/api/user-submissions?limit=${POSTS_PER_PAGE}&offset=${offset}`, {
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
        })
      } else {
        // For main pages (score, new, show)
        response = await fetch(`/api/posts?sortType=${sortType}&limit=${POSTS_PER_PAGE}&offset=${offset}`)
      }
      
      if (response.ok) {
        const data = await response.json()
        setNewsItems(data.posts || [])
        setCurrentPage(page)
      }
    } catch (error) {
      console.error('Error fetching posts for page:', error)
    }
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > MAX_PAGES) return
    fetchPostsForPage(page)
  }

  // Calculate pagination state
  const hasNextPage = currentPage < MAX_PAGES && newsItems.length === POSTS_PER_PAGE
  const hasPrevPage = currentPage > 1

  // Fetch votes for the current user when component mounts
  useEffect(() => {
    const fetchVotes = async () => {
      if (!isAuthenticated || !user?.$id || newsItems.length === 0) {
        return
      }

      try {
        // Get all post IDs from the page
        const postIds = newsItems.map(post => post.id)
        
        // Use the new helper function to fetch votes for all resources
        const voteMap = await fetchUserVotesForResources(
          postIds.map(id => ({ id, type: 'post' as const }))
        )
        
        // Initialize vote states with fetched data
        const initialVoteStates: Record<string, VoteState> = {}
        newsItems.forEach(post => {
          const voteState = voteMap.get(post.id)
          initialVoteStates[post.id] = voteState || {
            currentVote: null,
            count: post.count
          }
        })
        
        setVoteStates(initialVoteStates)
      } catch (error) {
        console.error('Error fetching votes:', error)
      }
    }

    fetchVotes()
  }, [isAuthenticated, user?.$id, newsItems])

  // Helper function to get the current vote state for an item
  const getVoteState = (itemId: string): VoteState => {
    const item = newsItems.find(item => item.id === itemId)
    const voteState = voteStates[itemId]
    return {
      currentVote: voteState?.currentVote || null,
      count: voteState?.count !== undefined ? voteState.count : (item?.count || 0)
    }
  }

  // Helper function to update vote state for an item
  const updateVoteState = (itemId: string, newState: VoteState) => {
    setVoteStates(prev => ({
      ...prev,
      [itemId]: newState
    }))
  }

  // Helper function to set voting state for an item
  const setVotingState = (itemId: string, isVoting: boolean) => {
    setVotingItems(prev => {
      const newSet = new Set(prev)
      if (isVoting) {
        newSet.add(itemId)
      } else {
        newSet.delete(itemId)
      }
      return newSet
    })
  }

  const handleVoteClick = async (itemId: string, direction: "up" | "down") => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      console.log('User not authenticated, cannot vote')
      return
    }
    
    const currentState = getVoteState(itemId)
    
    if (votingItems.has(itemId)) {
      return // Prevent voting if already voting
    }

    setVotingState(itemId, true)
    try {
      await handleVote(itemId, 'post', direction, currentState.currentVote, currentState.count, (newState) => {
        updateVoteState(itemId, newState)
      })
    } catch (error) {
      console.error('Error handling vote:', error)
    } finally {
      setVotingState(itemId, false)
    }
  }

  return (
    <div className="flex-1 flex flex-col sm:flex-row gap-4 lg:gap-6 min-w-0">
      {/* Main Content */}
      <main className="flex-1 space-y-6 min-w-0">
        {/* Error Display */}
        {error && (
          <div className="bg-red-500 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-bold text-white">
                  Error Loading Posts
                </h3>
                <div className="mt-2 text-sm text-white">
                  <p>{error}</p>
                  <p className="mt-1 text-sm">
                    Please check your internet connection and try refreshing the page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stories Carousel */}
        {/* <StoriesCarousel /> */}

        {/* New Search and Filter Component */}
        {/* <SearchAndFilter /> */}

        {/* News Items List - All posts rendered at once */}
        <div className="space-y-4 min-h-screen">
          {newsItems.map((item, index) => {
            // Calculate the position in the list
            const position = index + 1
            
            // Determine if this is a top 3 article
            const isTop3 = position <= 3
            
            // Get the icon component from the icon name
            const IconComponent = getIconComponent(item.iconName)
            
            const voteState = getVoteState(item.id)
            const isVoting = votingItems.has(item.id)
            
            return (
              <div
                key={item.id}
              >
                <PostCard
                  item={item}
                  voteState={voteState}
                  isVoting={isVoting}
                  onVote={handleVoteClick}
                  isAuthenticated={isAuthenticated}
                  showVoting={true}
                />
              </div>
            )
          })}
        </div>

        {/* Gen Z Remark */}
        <div className="text-center text-gray-500 text-sm mt-20 mb-10">
          <p className="leading-10">You've scrolled to the end. That's cap. Go touch grass 🌱, or paginate below 👇</p>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
          onPageChange={handlePageChange}
        />
      </main>

      {/* Right Sidebar and Sponsored Ad */}
      <aside className="hidden lg:block w-full sm:w-64 lg:w-64 sticky top-20 h-fit">
        <RightSidebar />
        <div className="mt-4">
          <RotatingAdCopy />
        </div>
      </aside>
    </div>
  )
} 
"use client"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import Link from "next/link"
import { RightSidebar } from "@/components/right-sidebar"
import { StoriesCarousel } from "@/components/stories-carousel"
import { type NewsItem } from "@/lib/data"
import { handleVote, type VoteState } from "@/lib/voteHandler"
import { SponsoredAd } from "@/components/sponsored-ad"
import { SearchAndFilter } from "@/components/search-and-filter"
import { Favicon } from "@/components/favicon"
import { useAuth } from "@/contexts/auth-context"
import { getCachedJWT } from "@/lib/jwtCache"
import { trackPostClick, trackPageView } from "@/lib/plausible"

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

// --- Constants for virtualization ---
const ESTIMATED_ITEM_HEIGHT = 75
const MAX_ITEMS_DISPLAY = 50
const BUFFER_ITEMS = 10

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
}

export function ClientPage({ initialPosts, error }: ClientPageProps) {
  // Use the posts from Appwrite, fallback to empty array if none
  const limitedNewsItems = useMemo(() => initialPosts.slice(0, MAX_ITEMS_DISPLAY), [initialPosts])
  
  const [visibleItems, setVisibleItems] = useState<NewsItem[]>([])
  const [paddingTop, setPaddingTop] = useState(0)
  const [paddingBottom, setPaddingBottom] = useState(0)
  const [voteStates, setVoteStates] = useState<Record<string, VoteState>>({})
  const [votingItems, setVotingItems] = useState<Set<string>>(new Set())
  const { user, isAuthenticated } = useAuth()

  // Ref to measure the position of the news list within the document
  const newsListContainerRef = useRef<HTMLDivElement>(null)

  // Fetch votes for the current user when component mounts
  useEffect(() => {
    const fetchVotes = async () => {
      if (!isAuthenticated || !user?.$id || limitedNewsItems.length === 0) {
        return
      }

      try {
        const postIds = limitedNewsItems.map(post => post.id)
        
        // Get JWT token for authentication
        const jwt = await getCachedJWT()
        
        if (!jwt) {
          console.error('No JWT token available')
          return
        }

        const response = await fetch('/api/vote/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
          },
          body: JSON.stringify({ postIds })
        })

        if (response.ok) {
          const data = await response.json()
          
          // Initialize vote states with fetched data
          const initialVoteStates: Record<string, VoteState> = {}
          limitedNewsItems.forEach(post => {
            const voteType = data.votes[post.id] || null
            initialVoteStates[post.id] = {
              currentVote: voteType,
              score: post.score
            }
          })
          
          setVoteStates(initialVoteStates)
        } else {
          console.error('Failed to fetch votes:', response.status)
        }
      } catch (error) {
        console.error('Error fetching votes:', error)
      }
    }

    fetchVotes()
  }, [isAuthenticated, user?.$id, limitedNewsItems])

  // Helper function to get the current vote state for an item
  const getVoteState = (itemId: string): VoteState => {
    const item = limitedNewsItems.find(item => item.id === itemId)
    const voteState = voteStates[itemId]
    return {
      currentVote: voteState?.currentVote || null,
      score: voteState?.score !== undefined ? voteState.score : (item?.score || 0)
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
      await handleVote(itemId, direction, currentState.currentVote, currentState.score, (newState) => {
        updateVoteState(itemId, newState)
      })
    } catch (error) {
      console.error('Error handling vote:', error)
    } finally {
      setVotingState(itemId, false)
    }
  }

  const updateVisibleItems = useCallback(() => {
    const container = newsListContainerRef.current
    if (!container) return

    const scrollTop = window.scrollY
    const viewportHeight = window.innerHeight

    // Calculate the offset of the news list from the top of the document.
    const offsetFromDocumentTop = container.offsetTop

    // Adjust scrollTop relative to the start of the virtualized list
    const adjustedScrollTop = Math.max(0, scrollTop - offsetFromDocumentTop)

    const firstVisibleIndex = Math.floor(adjustedScrollTop / ESTIMATED_ITEM_HEIGHT)
    const lastVisibleIndex = Math.ceil((adjustedScrollTop + viewportHeight) / ESTIMATED_ITEM_HEIGHT)

    const newStartIndex = Math.max(0, firstVisibleIndex - BUFFER_ITEMS)
    const newEndIndex = Math.min(limitedNewsItems.length, lastVisibleIndex + BUFFER_ITEMS)

    // Use a temporary object on the ref to store previous indices for comparison
    const prevIndices = (container as any)._virtualizationIndices || { startIndex: -1, endIndex: -1 }

    if (newStartIndex !== prevIndices.startIndex || newEndIndex !== prevIndices.endIndex) {
      setVisibleItems(limitedNewsItems.slice(newStartIndex, newEndIndex))
      setPaddingTop(newStartIndex * ESTIMATED_ITEM_HEIGHT)
      setPaddingBottom((limitedNewsItems.length - newEndIndex) * ESTIMATED_ITEM_HEIGHT)

      // Store current indices for next comparison
      ;(container as any)._virtualizationIndices = {
        startIndex: newStartIndex,
        endIndex: newEndIndex,
      }
    }
  }, [limitedNewsItems])

  useEffect(() => {
    // Initial update on mount
    updateVisibleItems()

    let animationFrameId: number | null = null

    const handleScroll = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      animationFrameId = requestAnimationFrame(updateVisibleItems)
    }

    window.addEventListener("scroll", handleScroll)
    window.addEventListener("resize", handleScroll)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [updateVisibleItems])

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

        {/* Virtualized News Items List */}
        <div ref={newsListContainerRef} className="news-list-container min-h-[600px]">
          {/* This div creates the virtualized empty space above the visible items */}
          <div style={{ height: paddingTop }} />

          {/* Render only the currently visible items */}
          {visibleItems.map((item, index) => {
            // Calculate the actual position in the full list
            const actualIndex = (newsListContainerRef.current as any)?._virtualizationIndices?.startIndex || 0
            const position = actualIndex + index + 1
            
            // Determine if this is a top 3 article
            const isTop3 = position <= 3
            
            // Get the icon component from the icon name
            const IconComponent = getIconComponent(item.iconName)
            
            // Determine if this item has an external link
            const hasExternalLink = item.link && item.link.startsWith('http')
            const titleLinkHref = hasExternalLink ? item.link! : `/threads/${item.id}`
            const titleLinkTarget = hasExternalLink ? '_blank' : undefined
            const titleLinkRel = hasExternalLink ? 'noopener noreferrer' : undefined
            
            return (
              <div
                key={item.id}
                className={`bg-white px-4 py-2 rounded-lg hover:shadow-sm transition-shadow flex mb-4 relative group ${item.isSponsored ? "bg-neutral-50" : ""}`}
                style={{ height: `${ESTIMATED_ITEM_HEIGHT - 15}px` }}
              >
                {/* Upvote/Downvote Section */}
                {!item.isSponsored && (
                  <div className="flex flex-col items-center justify-center mr-4 text-gray-500 w-8">
                    {(() => {
                      const voteState = getVoteState(item.id)
                      const isVoting = votingItems.has(item.id)
                      return (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-5 w-5 ${
                              voteState.currentVote === 'up' 
                                ? 'text-green-600 bg-green-50 hover:bg-green-50' 
                                : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
                            }`}
                            onClick={async (e) => {
                              e.preventDefault()
                              if (!isAuthenticated) {
                                window.location.href = '/login'
                                return
                              }
                              await handleVoteClick(item.id, "up")
                            }}
                            disabled={isVoting}
                            aria-label={`Upvote ${item.title}`}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <span className="text-[0.65rem] text-gray-700 font-medium">
                            {voteState.score}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-5 w-5 ${
                              voteState.currentVote === 'down' 
                                ? 'text-red-600 bg-red-50 hover:bg-red-50' 
                                : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                            }`}
                            onClick={async (e) => {
                              e.preventDefault()
                              if (!isAuthenticated) {
                                window.location.href = '/login'
                                return
                              }
                              await handleVoteClick(item.id, "down")
                            }}
                            disabled={isVoting}
                            aria-label={`Downvote ${item.title}`}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </>
                      )
                    })()}
                  </div>
                )}
                {item.isSponsored && (
                  <div className="flex flex-col items-center justify-center mr-4 text-gray-500 w-8">
                    <span className="text-[0.65rem] text-gray-600 font-semibold">Ad</span>
                  </div>
                )}

                {/* Article Content */}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  {/* Title with external link */}
                  <div className="flex items-center gap-2 mb-1">
                    {item.type === "show" && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-600 rounded-md whitespace-nowrap">
                        Show RF
                      </span>
                    )}
                    <Link 
                      href={titleLinkHref} 
                      target={titleLinkTarget} 
                      rel={titleLinkRel}
                      onClick={() => trackPostClick(item.id, item.title, !!hasExternalLink)}
                      className="font-medium text-gray-900 font-heading whitespace-nowrap overflow-hidden text-ellipsis flex-1 hover:text-blue-600 transition-colors cursor-pointer"
                      title={item.title}
                    >
                      {item.title}
                    </Link>
                    {hasExternalLink && (
                      <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    )}
                  </div>
                  
                  {/* Meta information with thread link */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Favicon domain={item.domain} size={16} className="rounded" />
                    <span>{cleanDomainForDisplay(item.domain)}</span>
                    {!item.isSponsored && item.daysAgo && (
                      <>
                        <span>•</span>
                        <span>{item.daysAgo}</span>
                      </>
                    )}
                    {!item.isSponsored && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{item.author}</span>
                        <span className="hidden sm:inline">•</span>
                        <Link 
                          href={`/threads/${item.id}`}
                          onClick={() => trackPostClick(item.id, item.title, false)}
                          className="hidden sm:inline hover:text-blue-600 transition-colors"
                        >
                          {item.comments.length} comments
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* This div creates the virtualized empty space below the visible items */}
          <div style={{ height: paddingBottom }} />
        </div>

        {/* Gen Z Remark */}
        <div className="text-center text-gray-500 text-sm mt-20 mb-10">
          <p className="leading-10">You've scrolled to the end. That's cap. Go touch grass 🌱.</p>
        </div>
      </main>

      {/* Right Sidebar and Sponsored Ad */}
      <aside className="hidden lg:block w-full sm:w-64 lg:w-64 sticky top-20 h-fit">
        <RightSidebar />
        <div className="mt-6">
          <RotatingAdCopy />
        </div>
      </aside>
    </div>
  )
} 
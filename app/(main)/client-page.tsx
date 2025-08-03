"use client"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { RightSidebar } from "@/components/right-sidebar"
import { StoriesCarousel } from "@/components/stories-carousel"
import { type NewsItem } from "@/lib/data"
import { handleVote } from "@/lib/voteHandler"
import { SponsoredAd } from "@/components/sponsored-ad"
import { SearchAndFilter } from "@/components/search-and-filter"
import { Favicon } from "@/components/favicon"
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
}

export function ClientPage({ initialPosts }: ClientPageProps) {
  // Use the posts from Appwrite, fallback to empty array if none
  const limitedNewsItems = initialPosts.slice(0, MAX_ITEMS_DISPLAY)
  
  const [visibleItems, setVisibleItems] = useState<NewsItem[]>([])
  const [paddingTop, setPaddingTop] = useState(0)
  const [paddingBottom, setPaddingBottom] = useState(0)

  // Ref to measure the position of the news list within the document
  const newsListContainerRef = useRef<HTMLDivElement>(null)

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
    <div className="flex-1 flex flex-col sm:flex-row gap-4 lg:gap-6 min-w-0 pt-4 lg:pt-4 mt-0 lg:mt-1">
      {/* Main Content */}
      <main className="flex-1 space-y-6 min-w-0">
        {/* Stories Carousel */}
        <StoriesCarousel />

        {/* New Search and Filter Component */}
        <SearchAndFilter />

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
            
            return (
              <Link key={item.id} href={`/threads/${item.id}`} passHref>
                <div
                  className={`bg-white px-4 py-2 rounded-lg hover:shadow-sm transition-shadow flex mb-4 cursor-pointer relative ${item.isSponsored ? "bg-neutral-50" : ""}`}
                  style={{ height: `${ESTIMATED_ITEM_HEIGHT - 15}px` }}
                >
                  {/* Upvote/Downvote Section */}
                  {!item.isSponsored && (
                    <div className="flex flex-col items-center justify-center mr-4 text-gray-500 w-8">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 hover:bg-green-50 text-gray-400 hover:text-green-600"
                        onClick={(e) => {
                          e.preventDefault()
                          handleVote(item.id, "up")
                        }}
                        aria-label={`Upvote ${item.title}`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <span className="text-[0.65rem] text-gray-700 font-medium">{item.score}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 hover:bg-red-50 text-gray-400 hover:text-red-600"
                        onClick={(e) => {
                          e.preventDefault()
                          handleVote(item.id, "down")
                        }}
                        aria-label={`Downvote ${item.title}`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {item.isSponsored && (
                    <div className="flex flex-col items-center justify-center mr-4 text-gray-500 w-8">
                      <span className="text-[0.65rem] text-gray-600 font-semibold">Ad</span>
                    </div>
                  )}

                  {/* Article Content */}
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <h3
                      className="font-medium text-gray-900 mb-1 font-heading whitespace-nowrap overflow-hidden text-ellipsis"
                      title={item.title}
                    >
                      {item.title}
                    </h3>
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
                          <span className="hidden sm:inline">{item.comments.length} comments</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
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
      <aside className="hidden lg:block w-full sm:w-64 lg:w-64 sticky top-16 h-fit">
        <RightSidebar />
        <div className="mt-6">
          <RotatingAdCopy />
        </div>
      </aside>
    </div>
  )
} 
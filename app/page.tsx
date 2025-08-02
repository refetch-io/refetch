"use client"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { LeftSidebar } from "@/components/left-sidebar"
import { RightSidebar } from "@/components/right-sidebar"
import { BackToTopButton } from "@/components/back-to-top-button"
import { StoriesCarousel } from "@/components/stories-carousel" // Import the new component
import { allNewsItems, type NewsItem } from "@/lib/data" // Import allNewsItems and NewsItem from data.ts
import { handleVote } from "@/lib/voteHandler" // Declare handleVote variable
import { AdPlaceholder } from "@/components/ad-placeholder" // Import AdPlaceholder
import { SearchAndFilter } from "@/components/search-and-filter" // Import SearchAndFilter
import { Favicon } from "@/components/favicon" // Import Favicon component

// --- Constants for virtualization ---
// This height should accurately represent one news item including its bottom margin.
// Adjust if item design changes significantly.
const ESTIMATED_ITEM_HEIGHT = 75 // px (e.g., 60px for content + 15px for mb-4)
const TOTAL_ITEMS_COUNT = 1000 // Generate a large pool of items for virtualization
const BUFFER_ITEMS = 10 // Number of items to render above and below the viewport

export default function RefetchHomePage() {
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
    // This accounts for the header and 'About' section above the virtualized list.
    const offsetFromDocumentTop = container.offsetTop

    // Adjust scrollTop relative to the start of the virtualized list
    const adjustedScrollTop = Math.max(0, scrollTop - offsetFromDocumentTop)

    const firstVisibleIndex = Math.floor(adjustedScrollTop / ESTIMATED_ITEM_HEIGHT)
    const lastVisibleIndex = Math.ceil((adjustedScrollTop + viewportHeight) / ESTIMATED_ITEM_HEIGHT)

    const newStartIndex = Math.max(0, firstVisibleIndex - BUFFER_ITEMS)
    const newEndIndex = Math.min(allNewsItems.length, lastVisibleIndex + BUFFER_ITEMS)

    // Use a temporary object on the ref to store previous indices for comparison
    // This avoids adding startIndex/endIndex to useCallback dependencies, preventing infinite loops
    const prevIndices = (container as any)._virtualizationIndices || { startIndex: -1, endIndex: -1 }

    if (newStartIndex !== prevIndices.startIndex || newEndIndex !== prevIndices.endIndex) {
      setVisibleItems(allNewsItems.slice(newStartIndex, newEndIndex))
      setPaddingTop(newStartIndex * ESTIMATED_ITEM_HEIGHT)
      setPaddingBottom((allNewsItems.length - newEndIndex) * ESTIMATED_ITEM_HEIGHT)

      // Store current indices for next comparison
      ;(container as any)._virtualizationIndices = {
        startIndex: newStartIndex,
        endIndex: newEndIndex,
      }
    }
  }, [allNewsItems]) // allNewsItems is stable due to useState initialization

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
    // Also re-calculate on window resize (e.g., mobile orientation change)
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
    <div className="min-h-screen bg-gray-100 font-body">
      {/* Header - Fixed to Top */}
      <header className="bg-[#4e1cb3] text-white py-2 fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center sm:justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Refetch Logo" width={100} height={32} className="rounded" />
          </div>

          {/* Removed search bar from header */}
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <Button variant="ghost" className="text-white hover:bg-[#5d2bc4] h-8 px-3 text-sm">
              Sign In
            </Button>
            {/* Removed separator and Sign Up button */}
          </div>
        </div>
      </header>

      {/* Main content wrapper with padding to account for fixed header */}
      <div className="max-w-7xl mx-auto flex flex-wrap gap-4 lg:gap-6 px-4 sm:px-6 pt-[60px] pb-[50px]">
        {/* Left Sidebar */}
        <LeftSidebar />

        {/* Main Content and Right Sidebar */}
        <div className="flex-1 flex flex-col sm:flex-row gap-4 lg:gap-6 pt-0 lg:pt-4 mt-0 lg:mt-10 min-w-0">
          {/* Main Content */}
          <main className="flex-1 space-y-6 min-w-0">
            {/* Stories Carousel */}
            <StoriesCarousel />

            {/* New Search and Filter Component */}
            <SearchAndFilter />

            {/* Virtualized News Items List */}
            {/* The ref is crucial here to measure the list's position from the top of the document */}
            <div ref={newsListContainerRef} className="news-list-container">
              {/* This div creates the virtualized empty space above the visible items */}
              <div style={{ height: paddingTop }} />

              {/* Render only the currently visible items */}
              {visibleItems.map((item) => {
                return (
                  <Link key={item.id} href={`/articles/${item.id}`} passHref>
                    <div
                      className={`bg-white px-4 py-2 rounded-lg hover:shadow-sm transition-shadow flex mb-4 cursor-pointer ${item.isSponsored ? "bg-neutral-50" : ""}`}
                      style={{ height: `${ESTIMATED_ITEM_HEIGHT - 15}px` }} // Adjust for mb-4 spacing
                    >
                      {/* Upvote/Downvote Section */}
                      {!item.isSponsored && (
                        <div className="flex flex-col items-center justify-center mr-4 text-gray-500 w-8">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-gray-100"
                            onClick={(e) => {
                              e.preventDefault() // Prevent navigation on vote click
                              handleVote(item.id, "up")
                            }}
                            aria-label={`Upvote ${item.title}`}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <span className="text-[0.65rem] text-gray-600">{item.score}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-gray-100"
                            onClick={(e) => {
                              e.preventDefault() // Prevent navigation on vote click
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

                      {/* Article Content - Added flex, flex-col, justify-center, and min-w-0 */}
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <h3
                          className="font-medium text-gray-900 mb-1 font-heading whitespace-nowrap overflow-hidden text-ellipsis"
                          title={item.title}
                        >
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {/* Render the favicon for the domain */}
                          <Favicon domain={item.domain} size={16} className="rounded" />
                          <span>{item.domain}</span>
                          {/* Only render daysAgo if it's not a sponsored item */}
                          {!item.isSponsored && item.daysAgo && (
                            <>
                              <span>•</span>
                              <span>{item.daysAgo}</span>
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
              <p className="leading-10">You've scrolled to the end. That's cap. Go touch grass.</p>
            </div>
          </main>

          {/* Right Sidebar and Ad Placeholder - now wrapped in a single sticky aside */}
          <aside className="w-full sm:w-64 lg:w-64 sticky top-16 h-fit flex flex-col gap-4">
            <RightSidebar />
            <AdPlaceholder />
          </aside>
        </div>
      </div>
      <BackToTopButton />
    </div>
  )
}

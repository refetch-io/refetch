"use client"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { Favicon } from "@/components/favicon"
import { type NewsItem } from "@/lib/data"
import { type VoteState } from "@/lib/voteHandler"
import { trackPostClick } from "@/lib/plausible"

interface PostCardProps {
  item: NewsItem
  voteState: VoteState
  isVoting: boolean
  onVote: (itemId: string, direction: "up" | "down") => void
  isAuthenticated: boolean
  showVoting?: boolean
  className?: string
}

// Helper function to clean domain for display (remove www prefix)
const cleanDomainForDisplay = (domain: string) => {
  return domain.replace(/^www\./, '')
}

export function PostCard({ 
  item, 
  voteState, 
  isVoting, 
  onVote, 
  isAuthenticated, 
  showVoting = true,
  className = ""
}: PostCardProps) {
  // Determine if this item has an external link
  const hasExternalLink = item.link && item.link.startsWith('http')
  const titleLinkHref = hasExternalLink && item.link ? `${item.link}${item.link.includes('?') ? '&' : '?'}ref=refetch.io` : `/threads/${item.id}`
  const titleLinkTarget = hasExternalLink ? '_blank' : undefined
  const titleLinkRel = hasExternalLink ? 'noopener noreferrer' : undefined

  return (
    <div className={`bg-white px-4 py-1 rounded-lg hover:shadow-sm transition-shadow flex mb-4 relative group ${item.isSponsored ? "bg-neutral-50" : ""} ${className}`}>
      {/* Upvote/Downvote Section */}
      {showVoting && !item.isSponsored && (
        <div className="flex flex-col items-center justify-center mr-4 text-gray-500 w-8">
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
              await onVote(item.id, "up")
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
              await onVote(item.id, "down")
            }}
            disabled={isVoting}
            aria-label={`Downvote ${item.title}`}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
      {showVoting && item.isSponsored && (
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
}

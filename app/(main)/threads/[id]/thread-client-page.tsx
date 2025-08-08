"use client"
import { useState, useEffect } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CommentsSection } from "@/components/comments-section"
import { handleVote, fetchUserVote, type VoteState } from "@/lib/voteHandler"
import { Favicon } from "@/components/favicon"
import { type NewsItem } from "@/lib/data"

interface ThreadClientPageProps {
  article: NewsItem
}

export function ThreadClientPage({ article }: ThreadClientPageProps) {
  const [voteState, setVoteState] = useState<VoteState>({
    currentVote: null,
    score: article.score // Initialize with the actual post score
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isVoting, setIsVoting] = useState(false)

  // Fetch user's current vote state on component mount
  useEffect(() => {
    const loadVoteState = async () => {
      try {
        const state = await fetchUserVote(article.id)
        if (state) {
          // Use the fetched score (which should be the actual post score)
          setVoteState({
            currentVote: state.currentVote,
            score: state.score
          })
        }
      } catch (error) {
        console.error('Error loading vote state:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadVoteState()
  }, [article.id])

  const handleVoteClick = async (direction: "up" | "down") => {
    if (isVoting || voteState.currentVote === direction) {
      return // Prevent voting if already voting or already voted this way
    }

    setIsVoting(true)
    try {
      // Pass the current score from the post, not from vote state
      const currentScore = article.score
      await handleVote(article.id, direction, voteState.currentVote, currentScore, (newState) => {
        setVoteState(newState)
      })
    } catch (error) {
      console.error('Error handling vote:', error)
    } finally {
      setIsVoting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="flex-1 space-y-6 min-w-0">
        <div className="bg-white px-4 py-2 rounded-lg border-none shadow-none w-full flex">
          <div className="flex flex-col items-center justify-center mr-4 text-gray-500 w-10">
            <div className="h-6 w-6 animate-pulse bg-gray-200 rounded"></div>
            <div className="text-sm text-gray-600 animate-pulse bg-gray-200 rounded w-8 h-4 mt-1"></div>
            <div className="h-6 w-6 animate-pulse bg-gray-200 rounded mt-1"></div>
          </div>
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 space-y-6 min-w-0">
      {/* Article Card - Same structure as main page */}
      <div className="bg-white px-4 py-2 rounded-lg border-none shadow-none w-full flex">
        {/* Upvote/Downvote Section */}
        <div className="flex flex-col items-center justify-center mr-4 text-gray-500 w-10">
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 hover:bg-gray-100 ${
              voteState.currentVote === 'up' 
                ? 'text-green-600 bg-green-50' 
                : 'text-gray-400'
            }`}
            onClick={() => handleVoteClick("up")}
            disabled={isVoting}
            aria-label={`Upvote ${article.title}`}
          >
            <ChevronUp className="h-5 w-5" />
          </Button>
          <span className="text-sm text-gray-600">{voteState.score}</span>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 hover:bg-gray-100 ${
              voteState.currentVote === 'down' 
                ? 'text-red-600 bg-red-50' 
                : 'text-gray-400'
            }`}
            onClick={() => handleVoteClick("down")}
            disabled={isVoting}
            aria-label={`Downvote ${article.title}`}
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>

        {/* Article Content */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <h3
            className="font-medium text-gray-900 mb-1 font-heading whitespace-nowrap overflow-hidden text-ellipsis text-lg"
            title={article.title}
          >
            {article.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {/* Render the favicon for the domain */}
            <Favicon domain={article.domain} size={20} className="rounded" />
            <span>{article.domain}</span>
            {article.daysAgo && (
              <>
                <span>•</span>
                <span>{article.daysAgo}</span>
              </>
            )}
            {/* Show author and comment count for non-sponsored items */}
            {!article.isSponsored && (
              <>
                <span>•</span>
                <span>{article.author}</span>
                <span>•</span>
                <span>{article.comments.length} comments</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <CommentsSection initialComments={article.comments} />
    </main>
  )
} 
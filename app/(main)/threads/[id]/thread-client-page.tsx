"use client"

import { CommentForm } from "@/components/comment-form"
import { useEffect, useState } from "react"
import type { NewsItem, Comment } from "@/lib/data"
import { type VoteState } from "@/lib/voteHandler"
import { handleVote } from "@/lib/voteHandler"
import { useAuth } from "@/contexts/auth-context"
import { getCachedJWT } from "@/lib/jwtCache"
import { PostCard } from "@/components/post-card"

interface ThreadClientPageProps {
  article: NewsItem
}

export function ThreadClientPage({ article }: ThreadClientPageProps) {
  const [voteState, setVoteState] = useState<VoteState>({ currentVote: null, score: article.score })
  const [isVoting, setIsVoting] = useState(false)
  
  const { isAuthenticated, user } = useAuth()

  // Fetch votes for the current user when component mounts
  useEffect(() => {
    const fetchVotes = async () => {
      if (!isAuthenticated || !user?.$id) {
        return
      }

      try {
        // Get JWT token for authentication
        const jwt = await getCachedJWT()
        
        if (!jwt) {
          console.error('No JWT token available')
          return
        }

        const response = await fetch(`/api/vote/state?postId=${article.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${jwt}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setVoteState({
            currentVote: data.currentVote || null,
            score: data.score !== undefined ? data.score : article.score
          })
        } else {
          console.error('Failed to fetch votes:', response.status)
          // Fallback to article score
          setVoteState({
            currentVote: null,
            score: article.score
          })
        }
      } catch (error) {
        console.error('Error fetching votes:', error)
        // Fallback to article score
        setVoteState({
          currentVote: null,
          score: article.score
        })
      }
    }

    fetchVotes()
  }, [isAuthenticated, user?.$id, article.id, article.score])

  const handleVoteClick = async (itemId: string, direction: "up" | "down") => {
    if (!isAuthenticated) {
      return
    }
    
    if (isVoting) {
      return // Prevent voting if already voting
    }

    setIsVoting(true)
    try {
      await handleVote(itemId, direction, voteState.currentVote, voteState.score, (newState) => {
        setVoteState(newState)
      })
    } catch (error) {
      console.error('Error handling vote:', error)
    } finally {
      setIsVoting(false)
    }
  }

  const handleCommentAdded = () => {
    // Refresh the article data to show the new comment
    // This is a simple approach - in a real app you might want to use SWR or React Query
    window.location.reload()
  }

  return (
    <main className="w-full space-y-6">
      {/* Article Card - Using PostCard component for consistency */}
      <PostCard
        item={article}
        voteState={voteState}
        isVoting={isVoting}
        onVote={handleVoteClick}
        isAuthenticated={isAuthenticated}
        showVoting={true}
      />

      {/* Comment Form */}
      <CommentForm postId={article.id} onCommentAdded={handleCommentAdded} isFixed={true} />

      {/* Comments Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Comments ({article.comments.length})</h2>
        
        {article.comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
        ) : (
          <div className="space-y-6">
            {article.comments.map((comment: Comment) => (
              <div key={comment.id} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  {/* Comment Header */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                        {comment.author.charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-800">{comment.author}</span>
                      <span className="text-gray-500">• {comment.timeAgo}</span>
                      <span className="text-gray-500">• {comment.score} points</span>
                    </div>
                    <p className="text-gray-700 text-sm">{comment.text}</p>
                    
                    {/* Nested Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-6 mt-4 space-y-4 border-l pl-4 border-gray-200">
                        {comment.replies.map((reply: Comment) => (
                          <div key={reply.id} className="bg-gray-50 p-3 rounded">
                            <div className="flex items-center gap-2 text-sm mb-2">
                              <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                                {reply.author.charAt(0)}
                              </div>
                              <span className="font-semibold text-gray-800">{reply.author}</span>
                              <span className="text-gray-500">• {reply.timeAgo}</span>
                              <span className="text-gray-500">• {reply.score} points</span>
                            </div>
                            <p className="text-gray-700 text-sm">{reply.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

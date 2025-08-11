"use client"

import { CommentForm } from "@/components/comment-form"
import { useEffect, useState } from "react"
import type { NewsItem, Comment } from "@/lib/data"
import { type VoteState } from "@/lib/voteHandler"
import { handleVote } from "@/lib/voteHandler"
import { useAuth } from "@/contexts/auth-context"
import { getCachedJWT } from "@/lib/jwtCache"
import { PostCard } from "@/components/post-card"
import { avatars } from "@/lib/appwrite"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCommentFormHeight } from "@/app/(main)/layout"

interface ThreadClientPageProps {
  article: NewsItem
}

export function ThreadClientPage({ article }: ThreadClientPageProps) {
  const [voteState, setVoteState] = useState<VoteState>({ currentVote: null, score: article.score })
  const [isVoting, setIsVoting] = useState(false)
  const [comments, setComments] = useState<Comment[]>(article.comments || [])
  const [commentFormHeight, setCommentFormHeight] = useState(0)
  
  const { isAuthenticated, user } = useAuth()
  const { setHeight: setLayoutHeight } = useCommentFormHeight()

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
    // Refresh comments from the API to get the latest comment
    fetch(`/api/comments?postId=${article.id}`)
      .then(response => response.json())
      .then(data => {
        if (data.comments) {
          setComments(data.comments)
        }
      })
      .catch(error => {
        console.error('Error refreshing comments:', error)
      })
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
        showCommentsLink={false}
      />

      {/* Post Description */}
      {article.description && (
        <div className="px-4 py-3">
          <p className="text-gray-600 text-sm leading-relaxed">
            {article.description}
          </p>
        </div>
      )}

      {/* Comment Form */}
      <CommentForm 
        postId={article.id} 
        onCommentAdded={handleCommentAdded} 
        isFixed={true}
        onHeightChange={setCommentFormHeight}
      />

      {/* Comments Section Title */}
      <div className="bg-gray-200 rounded-lg px-4 py-3">
        <h3 className="text-xs font-medium text-gray-700">
          Comments
          <span className="ml-2 text-gray-700">
            ({comments.length})
          </span>
        </h3>
      </div>

      {/* Comments Section */}
      <div className="space-y-6 pl-4 min-h-[600px]">
        {comments.length === 0 ? (
          <div className="flex justify-center">
            <div className="flex items-center justify-center p-6 mt-5 mb-64">
              <p className="text-gray-600 text-xs text-center">No comments yet. Start the conversation below</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment: Comment) => (
              <div key={comment.id} className="flex items-start gap-3">
                {/* Avatar on the left */}
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarImage src={avatars.getInitials(comment.author, 80, 80)} />
                </Avatar>
                
                {/* Comment content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs mb-2">
                    <span className="text-gray-800">{comment.author}</span>
                    <span className="text-gray-500">• {comment.timeAgo}</span>
                    <span className="text-gray-500">• {comment.score} points</span>
                  </div>
                  <p className="text-gray-700 text-sm">{comment.text}</p>
                  
                  {/* Nested Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-6 mt-4 space-y-4 border-l pl-4 border-gray-200">
                      {comment.replies.map((reply: Comment) => (
                        <div key={reply.id} className="flex items-start gap-3">
                          <Avatar className="w-6 h-6 mt-1">
                            <AvatarImage src={avatars.getInitials(reply.author, 60, 60)} />
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-xs mb-2">
                              <span className="text-gray-800">{reply.author}</span>
                              <span className="text-gray-500">• {reply.timeAgo}</span>
                              <span className="text-gray-500">• {reply.score} points</span>
                            </div>
                            <p className="text-gray-700 text-sm">{reply.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

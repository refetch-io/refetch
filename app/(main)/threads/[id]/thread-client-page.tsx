"use client"

import { CommentForm } from "@/components/comment-form"
import { CommentVote } from "@/components/comment-vote"
import { useEffect, useState, useMemo } from "react"
import type { NewsItem, Comment } from "@/lib/data"
import { type VoteState } from "@/lib/voteHandler"
import { handleVote, fetchUserVotesForResources } from "@/lib/voteHandler"
import { useAuth } from "@/contexts/auth-context"
import { getCachedJWT } from "@/lib/jwtCache"
import { PostCard } from "@/components/post-card"
import { avatars } from "@/lib/appwrite"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Clock, TrendingUp } from "lucide-react"

interface ThreadClientPageProps {
  article: NewsItem
}

type SortType = 'date' | 'votes'

export function ThreadClientPage({ article }: ThreadClientPageProps) {
  const [voteState, setVoteState] = useState<VoteState>({ currentVote: null, score: article.score })
  const [isVoting, setIsVoting] = useState(false)
  const [commentVoteStates, setCommentVoteStates] = useState<Record<string, VoteState>>({})
  const [isCommentVoting, setIsCommentVoting] = useState(false)
  const [comments, setComments] = useState<Comment[]>(article.comments || [])
  const [isCommentFormMinimized, setIsCommentFormMinimized] = useState(false)
  const [sortType, setSortType] = useState<SortType>('date')
  
  const { isAuthenticated, user } = useAuth()

  // Sort comments based on current sort type
  const sortedComments = useMemo(() => {
    const sorted = [...comments]
    
    if (sortType === 'date') {
      // Sort by date (newest first) - keep original order for now
      // In a real implementation, you'd want to store actual timestamps
      return sorted
    } else if (sortType === 'votes') {
      // Sort by vote count (highest first)
      return sorted.sort((a, b) => {
        const aScore = commentVoteStates[a.id]?.score ?? a.score
        const bScore = commentVoteStates[b.id]?.score ?? b.score
        return bScore - aScore
      })
    }
    
    return sorted
  }, [comments, sortType, commentVoteStates])

  // Fetch votes for the current user when component mounts
  useEffect(() => {
    const fetchVotes = async () => {
      if (!isAuthenticated || !user?.$id) {
        return
      }

      try {
        // Get all resource IDs from the page (post + comments)
        const resources = [
          { id: article.id, type: 'post' as const },
          ...comments.map(comment => ({ id: comment.id, type: 'comment' as const })),
          ...comments.flatMap(comment => 
            comment.replies ? comment.replies.map(reply => ({ id: reply.id, type: 'comment' as const })) : []
          )
        ]

        // Use the new helper function to fetch votes for all resources
        const voteMap = await fetchUserVotesForResources(resources)
        
        // Set post vote state
        const postVoteState = voteMap.get(article.id)
        if (postVoteState) {
          setVoteState(postVoteState)
        }

        // Set comment vote states
        const newCommentVoteStates: Record<string, VoteState> = {}
        comments.forEach(comment => {
          const commentVoteState = voteMap.get(comment.id)
          newCommentVoteStates[comment.id] = commentVoteState || { currentVote: null, score: comment.score }
          
          if (comment.replies) {
            comment.replies.forEach(reply => {
              const replyVoteState = voteMap.get(reply.id)
              newCommentVoteStates[reply.id] = replyVoteState || { currentVote: null, score: reply.score }
            })
          }
        })
        setCommentVoteStates(newCommentVoteStates)
      } catch (error) {
        console.error('Error fetching votes:', error)
        // Fallback to default states
        setVoteState({ currentVote: null, score: article.score })
        const defaultCommentVoteStates: Record<string, VoteState> = {}
        comments.forEach(comment => {
          defaultCommentVoteStates[comment.id] = { currentVote: null, score: comment.score }
          if (comment.replies) {
            comment.replies.forEach(reply => {
              defaultCommentVoteStates[reply.id] = { currentVote: null, score: reply.score }
            })
          }
        })
        setCommentVoteStates(defaultCommentVoteStates)
      }
    }

    fetchVotes()
  }, [isAuthenticated, user?.$id, article.id, article.score, comments])

  // Initialize comment vote states when component mounts
  useEffect(() => {
    const initialVoteStates: Record<string, VoteState> = {}
    if (comments.length > 0) {
      comments.forEach((comment: Comment) => {
        initialVoteStates[comment.id] = { currentVote: null, score: comment.score }
        if (comment.replies) {
          comment.replies.forEach((reply: Comment) => {
            initialVoteStates[reply.id] = { currentVote: null, score: reply.score }
          })
        }
      })
      setCommentVoteStates(initialVoteStates)
    }
  }, [comments])

  const handleVoteClick = async (itemId: string, direction: "up" | "down") => {
    if (!isAuthenticated) {
      return
    }
    
    if (isVoting) {
      return // Prevent voting if already voting
    }

    setIsVoting(true)
    try {
      await handleVote(itemId, 'post', direction, voteState.currentVote, voteState.score, (newState) => {
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
          // Initialize vote states for new comments
          const newVoteStates: Record<string, VoteState> = {}
          data.comments.forEach((comment: Comment) => {
            newVoteStates[comment.id] = { currentVote: null, score: comment.score }
            if (comment.replies) {
              comment.replies.forEach((reply: Comment) => {
                newVoteStates[reply.id] = { currentVote: null, score: reply.score }
              })
            }
          })
          setCommentVoteStates(newVoteStates)
        }
      })
      .catch(error => {
        console.error('Error refreshing comments:', error)
      })
  }

  const handleCommentFormMinimizedChange = (isMinimized: boolean) => {
    setIsCommentFormMinimized(isMinimized)
  }

  const handleCommentVote = async (commentId: string, direction: "up" | "down") => {
    if (!isAuthenticated) {
      return
    }
    
    if (isCommentVoting) {
      return
    }

    setIsCommentVoting(true)
    try {
      // Get current vote state for this comment
      const currentVoteState = commentVoteStates[commentId] || { currentVote: null, score: 0 }
      
      await handleVote(commentId, 'comment', direction, currentVoteState.currentVote, currentVoteState.score, (newState) => {
        setCommentVoteStates(prev => ({
          ...prev,
          [commentId]: newState
        }))
      })
    } catch (error) {
      console.error('Error handling comment vote:', error)
    } finally {
      setIsCommentVoting(false)
    }
  }

  const handleSortChange = (newSortType: SortType) => {
    setSortType(newSortType)
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

      {/* Comments Section Title with Sort Buttons */}
      <div className="bg-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-gray-700">
            Comments
            <span className="ml-2 text-gray-700">
              ({comments.length})
            </span>
          </h3>
          
          {/* Sort Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 mr-2">Sort by:</span>
            <Button
              variant={sortType === 'date' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange('date')}
              className="flex items-center gap-1 text-xs h-6 px-2"
            >
              <Clock className="h-3 w-3" />
              Date
            </Button>
            <Button
              variant={sortType === 'votes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange('votes')}
              className="flex items-center gap-1 text-xs h-6 px-2"
            >
              <TrendingUp className="h-3 w-3" />
              Votes
            </Button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {sortedComments.length === 0 ? (
          <div className="flex justify-center">
            <div className="flex items-center justify-center p-6">
              <p className="text-gray-600 text-xs text-center">No comments yet. Start the conversation below</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedComments.map((comment: Comment) => (
              <div key={comment.id} className="flex items-start gap-3">
                {/* Avatar on the left */}
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarImage src={avatars.getInitials(comment.author, 80, 80)} />
                </Avatar>
                
                {/* Comment content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs mb-2">
                    <span className="text-gray-800">{comment.author}</span>
                    {comment.userId === article.userId && (
                      <>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-500 text-xs">original poster</span>
                      </>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm mb-3">{comment.text}</p>
                  <div className="flex items-center gap-3">
                    <CommentVote
                      commentId={comment.id}
                      voteState={commentVoteStates[comment.id] || { currentVote: null, score: 0 }}
                      isVoting={isCommentVoting}
                      onVote={handleCommentVote}
                      isAuthenticated={isAuthenticated}
                      layout="horizontal"
                      size="sm"
                    />
                    <div className="text-xs text-gray-500">{comment.timeAgo}</div>
                  </div>
                  
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
                              {reply.userId === article.userId && (
                                <>
                                  <span className="text-gray-500">•</span>
                                  <span className="text-gray-500 text-xs">original poster</span>
                                </>
                              )}
                            </div>
                            <p className="text-gray-700 text-sm mb-3">{reply.text}</p>
                            <div className="flex items-center gap-3">
                              <CommentVote
                                commentId={reply.id}
                                voteState={commentVoteStates[reply.id] || { currentVote: null, score: 0 }}
                                isVoting={isCommentVoting}
                                onVote={handleCommentVote}
                                isAuthenticated={isAuthenticated}
                                layout="horizontal"
                                size="sm"
                              />
                              <div className="text-xs text-gray-500">{reply.timeAgo}</div>
                            </div>
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

      {/* Comment Form */}
      <div className="flex justify-center">
        <div className="w-full max-w-5xl">
          <CommentForm 
            postId={article.id} 
            onCommentAdded={handleCommentAdded} 
            isFixed={true}
            onMinimizedChange={handleCommentFormMinimizedChange}
          />
        </div>
      </div>

      {/* Dynamic margin below comment form based on its state */}
      <div className={`${isCommentFormMinimized ? 'h-8' : 'h-48'}`}></div>
    </main>
  )
}

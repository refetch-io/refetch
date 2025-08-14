"use client"

import { CommentForm } from "@/components/comment-form"
import { CommentVote } from "@/components/comment-vote"
import { useEffect, useState, useMemo } from "react"
import type { NewsItem, Comment } from "@/lib/data"
import { type VoteState } from "@/lib/types"
import { handleVote, fetchUserVotesForResources } from "@/lib/voteHandler"
import { useAuth } from "@/contexts/auth-context"
import { getCachedJWT } from "@/lib/jwtCache"
import { PostCard } from "@/components/post-card"
import { avatars } from "@/lib/appwrite"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Clock, TrendingUp, Reply } from "lucide-react"

interface ThreadClientPageProps {
  article: NewsItem
}

type SortType = 'date' | 'votes'

export function ThreadClientPage({ article }: ThreadClientPageProps) {
  const [voteState, setVoteState] = useState<VoteState>({ currentVote: null, count: article.count })
  const [isVoting, setIsVoting] = useState(false)
  const [commentVoteStates, setCommentVoteStates] = useState<Record<string, VoteState>>(() => {
    // Initialize with comment counts from SSR data to avoid showing 0 briefly
    const initialVoteStates: Record<string, VoteState> = {}
    
    const processComment = (comment: Comment) => {
      initialVoteStates[comment.id] = { currentVote: null, count: comment.count }
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach(processComment)
      }
    }
    
    if (article.comments && article.comments.length > 0) {
      article.comments.forEach(processComment)
    }
    
    return initialVoteStates
  })
  const [isCommentVoting, setIsCommentVoting] = useState(false)
  const [comments, setComments] = useState<Comment[]>(article.comments || [])
  
  // Debug logging for initial comments
  useEffect(() => {
    console.log('Initial comments from SSR:', article.comments)
    console.log('Current comments state:', comments)
  }, [])
  
  // Debug logging for comment changes
  useEffect(() => {
    console.log('Comments state updated:', comments)
    console.log('Comments with replies:', comments.filter(c => c.replies && c.replies.length > 0))
    
    // Log detailed nesting structure
    const logCommentStructure = (comment: Comment, level = 0) => {
      const indent = '  '.repeat(level)
      console.log(`${indent}Comment ${comment.id}: depth=${comment.depth}, replies=${comment.replies?.length || 0}`)
      if (comment.replies) {
        comment.replies.forEach(reply => logCommentStructure(reply, level + 1))
      }
    }
    
    comments.forEach(comment => logCommentStructure(comment))
  }, [comments])
  const [isCommentFormMinimized, setIsCommentFormMinimized] = useState(false)
  const [sortType, setSortType] = useState<SortType>('date')
  const [replyingTo, setReplyingTo] = useState<{ id: string; author: string; text: string; depth?: number } | null>(null)
  
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
        const aScore = commentVoteStates[a.id]?.count ?? a.count
        const bScore = commentVoteStates[b.id]?.count ?? b.count
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
          newCommentVoteStates[comment.id] = commentVoteState || { currentVote: null, count: comment.count }
          
          if (comment.replies) {
            comment.replies.forEach(reply => {
              const replyVoteState = voteMap.get(reply.id)
              newCommentVoteStates[reply.id] = replyVoteState || { currentVote: null, count: reply.count }
            })
          }
        })
        setCommentVoteStates(newCommentVoteStates)
      } catch (error) {
        console.error('Error fetching votes:', error)
        // Fallback to default states
        setVoteState({ currentVote: null, count: article.count || 0 })
        const defaultCommentVoteStates: Record<string, VoteState> = {}
        comments.forEach(comment => {
          defaultCommentVoteStates[comment.id] = { currentVote: null, count: comment.count }
          if (comment.replies) {
            comment.replies.forEach(reply => {
              defaultCommentVoteStates[reply.id] = { currentVote: null, count: reply.count }
            })
          }
        })
        setCommentVoteStates(defaultCommentVoteStates)
      }
    }

    fetchVotes()
  }, [isAuthenticated, user?.$id, article.id, article.count, comments])



  const handleVoteClick = async (itemId: string, direction: "up" | "down") => {
    if (!isAuthenticated) {
      return
    }
    
    if (isVoting) {
      return // Prevent voting if already voting
    }

    setIsVoting(true)
    try {
      await handleVote(itemId, 'post', direction, voteState.currentVote, voteState.count, (newState) => {
        setVoteState(newState)
      })
    } catch (error) {
      console.error('Error handling vote:', error)
    } finally {
      setIsVoting(false)
    }
  }

  const handleCommentAdded = () => {
    // Add a small delay to ensure the database has time to update
    setTimeout(() => {
      // Refresh comments from the API to get the latest comment
      fetch(`/api/comments?postId=${article.id}`)
        .then(response => response.json())
        .then(data => {
          if (data.comments) {
            console.log('Refreshed comments:', data.comments)
            setComments(data.comments)
            
            // Initialize vote states for new comments
            const newVoteStates: Record<string, VoteState> = {}
            const processComment = (comment: Comment) => {
              newVoteStates[comment.id] = { currentVote: null, count: comment.count }
              if (comment.replies && comment.replies.length > 0) {
                comment.replies.forEach(processComment)
              }
            }
            
            data.comments.forEach(processComment)
            setCommentVoteStates(newVoteStates)
          }
        })
        .catch(error => {
          console.error('Error refreshing comments:', error)
        })
    }, 500) // 500ms delay
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
      const currentVoteState = commentVoteStates[commentId] || { currentVote: null, count: comments.find(c => c.id === commentId)?.count || 0 }
      
      await handleVote(commentId, 'comment', direction, currentVoteState.currentVote, currentVoteState.count, (newState) => {
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

  // Helper function to check if a comment is from the original poster
  const isOriginalPoster = (commentUserId: string) => {
    return commentUserId === article.userId
  }

  // Recursive component to render comments with proper nesting
  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const canReply = depth < 2 // Allow replies up to depth 2 (3 levels total)
    
    return (
      <div className="flex items-start gap-3">
        {/* Avatar on the left */}
        <Avatar className="w-8 h-8 mt-1">
          <AvatarImage src={avatars.getInitials(comment.author, 80, 80)} />
        </Avatar>
        
        {/* Comment content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs mb-2">
            <span className="text-gray-800">{comment.author}</span>
            {isOriginalPoster(comment.userId || '') && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-gray-500 text-xs">original poster</span>
              </>
            )}
          </div>
          <div className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{comment.text}</div>
          
          <div className="flex items-center gap-3">
            <CommentVote
              commentId={comment.id}
              voteState={commentVoteStates[comment.id] || { currentVote: null, count: comment.count }}
              isVoting={isCommentVoting}
              onVote={handleCommentVote}
              isAuthenticated={isAuthenticated}
              layout="horizontal"
              size="sm"
            />
            <div className="text-xs text-gray-500">{comment.timeAgo}</div>
            {canReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                onClick={() => {
                  console.log('Reply clicked for comment:', comment.id)
                  setReplyingTo({
                    id: comment.id,
                    author: comment.author,
                    text: comment.text,
                    depth: comment.depth || depth
                  })
                  setIsCommentFormMinimized(false)
                }}
              >
                <Reply className="w-3 h-3" />
                Reply
              </Button>
            )}
          </div>
          
          {/* Recursively render nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className={`mt-4 space-y-4 border-l pl-4 ${depth === 0 ? 'ml-6' : depth === 1 ? 'ml-4' : 'ml-3'} border-gray-200`}>
              {comment.replies.map((reply: Comment) => (
                <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <main className="w-full space-y-6 px-4 lg:px-6">
      {/* Article Card - Using PostCard component for consistency */}
      <PostCard
        item={article}
        voteState={voteState}
        isVoting={isVoting}
        onVote={handleVoteClick}
        isAuthenticated={isAuthenticated}
        showVoting={true}
        showCommentsLink={false}
        showReadingTime={true}
      />

      {/* Post TL;DR only - don't show description if TL;DR is missing */}
      {article.tldr && (
        <div className="px-4 py-3">
          <p className="text-gray-600 text-sm leading-relaxed">
            <span className="text-gray-500">TL;DR:</span> {article.tldr}
          </p>
        </div>
      )}

      {/* Comments Section Title with Sort Controls */}
      <div className="bg-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-gray-700">
            Comments
            <span className="ml-2 text-gray-700">
              ({(() => {
                const total = comments.reduce((total, comment) => total + 1 + (comment.replies?.length || 0), 0)
                console.log('Comment count calculation:', { 
                  rootComments: comments.length, 
                  totalReplies: comments.reduce((sum, c) => sum + (c.replies?.length || 0), 0),
                  total
                })
                return total
              })()})
            </span>
          </h3>
          
          {/* Sort Controls */}
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => handleSortChange('date')}
              className={`flex items-center gap-1 transition-colors ${
                sortType === 'date' 
                  ? 'text-black font-medium' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="h-2.5 w-2.5" />
              Newest
            </button>
            <button
              onClick={() => handleSortChange('votes')}
              className={`flex items-center gap-1 transition-colors ${
                sortType === 'votes' 
                  ? 'text-black font-medium' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="h-2.5 w-2.5" />
              Popular
            </button>
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
              <CommentItem key={comment.id} comment={comment} />
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
            onMinimizedChange={(isMinimized) => {
              handleCommentFormMinimizedChange(isMinimized)
              // The CommentForm now handles reply cancellation internally when minimizing
              // so we don't need to reset replyingTo here
            }}
            replyId={replyingTo?.id}
            replyToComment={replyingTo}
            forceOpen={replyingTo !== null}
            onCancelReply={() => setReplyingTo(null)}
          />
        </div>
      </div>

      {/* Dynamic margin below comment form based on its state */}
      <div className={`${isCommentFormMinimized ? 'h-8' : 'h-48'}`}></div>
    </main>
  )
}

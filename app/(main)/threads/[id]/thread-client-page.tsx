"use client"

import { CommentForm } from "@/components/comment-form"
import { CommentVote } from "@/components/comment-vote"
import { useEffect, useState, useMemo, useCallback, memo } from "react"
import type { NewsItem, Comment } from "@/lib/data"
import { type VoteState } from "@/lib/types"
import { handleVote, fetchUserVotesForResources } from "@/lib/voteHandler"
import { deleteComment } from "@/lib/commentHandler"
import { useAuth } from "@/contexts/auth-context"
import { getCachedJWT } from "@/lib/jwtCache"
import { PostCard } from "@/components/post-card"
import { avatars } from "@/lib/appwrite"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Clock, TrendingUp, Reply, ChevronDown, ChevronUp, Trash2 } from "lucide-react"
import { BotLabel } from "@/components/bot-label"
import { ParsedText } from "@/components/parsed-text"

interface ThreadClientPageProps {
  article: NewsItem
}

type SortType = 'date' | 'votes'

// Move CommentItem outside to prevent recreation on every render
interface CommentItemProps {
  comment: Comment
  depth?: number
  onVote: (commentId: string, direction: "up" | "down") => void
  onReply: (comment: { id: string; author: string; text: string; depth?: number }) => void
  isVoting: boolean
  isAuthenticated: boolean
  isOriginalPoster: (commentUserId: string) => boolean
  getCommentVoteState: (commentId: string) => VoteState
  getCommentChildren: (commentId: string) => Comment[]
  onDeleteComment?: (commentId: string) => void // Add callback for deleting comment
  currentUserId?: string // Add current user ID for ownership check
}

const CommentItem = memo<CommentItemProps>(({ 
  comment, 
  depth = 0,
  onVote,
  onReply,
  isVoting,
  isAuthenticated,
  isOriginalPoster,
  getCommentVoteState,
  getCommentChildren,
  onDeleteComment,
  currentUserId
}) => {
  const canReply = depth < 2 // Allow replies up to depth 2 (3 levels total)
  
  const handleReplyClick = useCallback(() => {
    onReply({
      id: comment.id,
      author: comment.author,
      text: comment.text,
      depth: comment.depth || depth
    })
  }, [comment.id, comment.author, comment.text, comment.depth, depth, onReply])
  
  const handleCommentVote = useCallback((commentId: string, direction: "up" | "down") => {
    onVote(commentId, direction)
  }, [onVote])
  
  // Get the current vote state for this specific comment - memoized to prevent re-renders
  const currentVoteState = useMemo(() => {
    return getCommentVoteState(comment.id)
  }, [comment.id, getCommentVoteState])
  
  // Get children from the flattened map - memoized to prevent re-renders
  const children = useMemo(() => {
    return getCommentChildren(comment.id)
  }, [comment.id, getCommentChildren])
  
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
          {/* Bot detection logic - show for falsy values (0, empty string, undefined) */}
          {!comment.userId || comment.userId === '0' && (
            <BotLabel />
          )}
          {isOriginalPoster(comment.userId || '') && (
            <>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500 text-xs">original poster</span>
            </>
          )}
          <span className="text-gray-500">•</span>
          <span className="text-gray-500 text-xs">{comment.timeAgo}</span>
        </div>
        <div className="mb-3">
          <ParsedText text={comment.text} />
        </div>
        
        <div className="flex items-center gap-3">
          <CommentVote
            commentId={comment.id}
            voteState={currentVoteState}
            isVoting={isVoting}
            onVote={handleCommentVote}
            isAuthenticated={isAuthenticated}
            layout="horizontal"
            size="sm"
          />
          <div className="text-xs text-gray-500">{comment.timeAgo}</div>
          {/* Delete button - only show for comment owners, positioned before reply */}
          {onDeleteComment && comment.userId && currentUserId && comment.userId === currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
              onClick={() => onDeleteComment(comment.id)}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
          )}
          {canReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              onClick={handleReplyClick}
            >
              <Reply className="w-3 h-3" />
              Reply
            </Button>
          )}
        </div>
        
        {/* Recursively render nested replies */}
        {children.length > 0 && (
          <div className={`mt-4 space-y-4 border-l pl-4 ${depth === 0 ? 'ml-6' : depth === 1 ? 'ml-4' : 'ml-3'} border-gray-200`}>
            {children.map((reply: Comment) => (
              <CommentItem 
                key={reply.id} 
                comment={reply} 
                depth={depth + 1}
                onVote={onVote}
                onReply={onReply}
                isVoting={isVoting}
                isAuthenticated={isAuthenticated}
                isOriginalPoster={isOriginalPoster}
                getCommentVoteState={getCommentVoteState}
                getCommentChildren={getCommentChildren}
                onDeleteComment={onDeleteComment}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

CommentItem.displayName = 'CommentItem'

export function ThreadClientPage({ article }: ThreadClientPageProps) {
  const [voteState, setVoteState] = useState<VoteState>({ currentVote: null, count: article.count })
  const [isVoting, setIsVoting] = useState(false)
  
  // Flattened comment state management for better performance
  const [commentMap, setCommentMap] = useState<Map<string, Comment>>(() => {
    const map = new Map()
    const addCommentToMap = (comment: Comment) => {
      map.set(comment.id, comment)
      if (comment.replies) {
        comment.replies.forEach(addCommentToMap)
      }
    }
    
    if (article.comments) {
      article.comments.forEach(addCommentToMap)
    }
    return map
  })
  
  // Flattened vote state management - use individual state for each comment to prevent re-renders
  const [commentVoteStates, setCommentVoteStates] = useState<Record<string, VoteState>>(() => {
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

  // Helper function to get the current vote state for a comment (like main page)
  const getCommentVoteState = useCallback((commentId: string): VoteState => {
    const comment = commentMap.get(commentId)
    const voteState = commentVoteStates[commentId]
    return {
      currentVote: voteState?.currentVote || null,
      count: voteState?.count !== undefined ? voteState.count : (comment?.count || 0)
    }
  }, [commentMap, commentVoteStates])

  // Helper function to update vote state for a comment - only update the specific comment
  const updateCommentVoteState = useCallback((commentId: string, newState: VoteState) => {
    // Only update if the state actually changed to prevent unnecessary re-renders
    const currentState = commentVoteStates[commentId]
    if (currentState?.currentVote !== newState.currentVote || currentState?.count !== newState.count) {
      setCommentVoteStates(prev => ({
        ...prev,
        [commentId]: newState
      }))
    }
  }, [commentVoteStates])
  
  const [isCommentVoting, setIsCommentVoting] = useState(false)
  const [isCommentFormMinimized, setIsCommentFormMinimized] = useState(false)
  const [sortType, setSortType] = useState<SortType>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [replyingTo, setReplyingTo] = useState<{ id: string; author: string; text: string; depth?: number } | null>(null)
  
  const { isAuthenticated, user } = useAuth()

  // Helper function to get root comments from the flattened map
  const getRootComments = useMemo(() => {
    const rootComments: Comment[] = []
    commentMap.forEach(comment => {
      if (!comment.parentId) {
        rootComments.push(comment)
      }
    })
    return rootComments
  }, [commentMap])

  // Sort comments based on current sort type
  const sortedComments = useMemo(() => {
    const sorted = [...getRootComments]
    
    if (sortType === 'date') {
      // Sort by date - use direction to determine order
      return sortDirection === 'desc' ? sorted : sorted.reverse()
    } else if (sortType === 'votes') {
      // Sort by vote count - use direction to determine order
      const voteSorted = sorted.sort((a, b) => {
        const aScore = getCommentVoteState(a.id).count
        const bScore = getCommentVoteState(b.id).count
        return bScore - aScore
      })
      return sortDirection === 'desc' ? voteSorted : voteSorted.reverse()
    }
    
    return sorted
  }, [getRootComments, sortType, sortDirection, commentMap, commentVoteStates])

  // Helper function to get all comment IDs from any nesting level
  const getAllCommentIds = useCallback(() => {
    const ids: string[] = []
    commentMap.forEach(comment => ids.push(comment.id))
    return ids
  }, [commentMap])

  // Helper function to get children of a comment
  const getCommentChildren = useCallback((commentId: string): Comment[] => {
    const children: Comment[] = []
    commentMap.forEach(comment => {
      if (comment.parentId === commentId) {
        children.push(comment)
      }
    })
    return children
  }, [commentMap])

  // Debug logging for initial comments
  useEffect(() => {
    // Removed console.log statements
  }, [])
  
  // Debug logging for comment changes
  useEffect(() => {
    // Removed console.log statements
  }, [getRootComments])
  
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
          ...getAllCommentIds().map(id => ({ id, type: 'comment' as const })),
          ...getAllCommentIds().flatMap(id => 
            getCommentChildren(id).map(reply => ({ id: reply.id, type: 'comment' as const }))
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
        const processCommentForVotes = (commentId: string) => {
          const comment = commentMap.get(commentId)
          if (comment) {
            const commentVoteState = voteMap.get(commentId)
            newCommentVoteStates[commentId] = commentVoteState || { currentVote: null, count: comment.count }
          }
        }
        
        getAllCommentIds().forEach(processCommentForVotes)
        setCommentVoteStates(newCommentVoteStates)
      } catch (error) {
        console.error('Error fetching votes:', error)
        // Fallback to default states
        setVoteState({ currentVote: null, count: article.count || 0 })
        const defaultCommentVoteStates: Record<string, VoteState> = {}
        const processCommentForDefaults = (commentId: string) => {
          const comment = commentMap.get(commentId)
          if (comment) {
            defaultCommentVoteStates[commentId] = { currentVote: null, count: comment.count }
          }
        }
        
        getAllCommentIds().forEach(processCommentForDefaults)
        setCommentVoteStates(defaultCommentVoteStates)
      }
    }

    fetchVotes()
  }, [isAuthenticated, user?.$id, article.id, article.count, getAllCommentIds, getRootComments, commentMap])



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

  const handleCommentAdded = useCallback(() => {
    // Add a small delay to ensure the database has time to update
    setTimeout(() => {
      // Refresh comments from the API to get the latest comment
      fetch(`/api/comments?postId=${article.id}`)
        .then(response => response.json())
        .then(data => {
          if (data.comments) {
            setCommentMap(prev => {
              const newMap = new Map(prev)
              const addCommentToMap = (comment: Comment) => {
                newMap.set(comment.id, comment)
                if (comment.replies) {
                  comment.replies.forEach(addCommentToMap)
                }
              }
              data.comments.forEach(addCommentToMap)
              return newMap
            })
            
            // Initialize vote states for new comments using functional update
            const newCommentVoteStates: Record<string, VoteState> = {}
            const processComment = (comment: Comment) => {
              newCommentVoteStates[comment.id] = { currentVote: null, count: comment.count }
              if (comment.replies && comment.replies.length > 0) {
                comment.replies.forEach(processComment)
              }
            }
            
            data.comments.forEach(processComment)
            setCommentVoteStates(newCommentVoteStates)
          }
        })
        .catch(error => {
          console.error('Error refreshing comments:', error)
        })
    }, 500) // 500ms delay
  }, [article.id, getAllCommentIds])

  const handleCommentFormMinimizedChange = (isMinimized: boolean) => {
    setIsCommentFormMinimized(isMinimized)
  }

  const handleCommentVoteClick = useCallback(async (commentId: string, direction: "up" | "down") => {
    if (!isAuthenticated) {
      return
    }
    
    if (isCommentVoting) {
      return
    }

    setIsCommentVoting(true)
    try {
      // Get current vote state for this comment
      const currentVoteState = getCommentVoteState(commentId)
      
      // Optimistic update - update UI immediately
      const optimisticState = { ...currentVoteState }
      if (direction === 'up') {
        optimisticState.currentVote = optimisticState.currentVote === 'up' ? null : 'up'
        optimisticState.count = optimisticState.currentVote === 'up' ? optimisticState.count + 1 : optimisticState.count - 1
      } else {
        optimisticState.currentVote = optimisticState.currentVote === 'down' ? null : 'down'
        optimisticState.count = optimisticState.currentVote === 'down' ? optimisticState.count - 1 : optimisticState.count + 1
      }
      
      // Update vote state immediately for better UX
      updateCommentVoteState(commentId, optimisticState)
      
      await handleVote(commentId, 'comment', direction, currentVoteState.currentVote, currentVoteState.count, (newState) => {
        // Update with actual server response
        updateCommentVoteState(commentId, newState)
      })
    } catch (error) {
      console.error('Error handling comment vote:', error)
      // Revert optimistic update on error
      const originalComment = commentMap.get(commentId)
      const originalState = getCommentVoteState(commentId)
      updateCommentVoteState(commentId, originalState)
    } finally {
      setIsCommentVoting(false)
    }
  }, [isAuthenticated, isCommentVoting, getCommentVoteState, updateCommentVoteState])

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!isAuthenticated || !user) {
      return
    }

    if (confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      try {
        const result = await deleteComment(commentId)
        if (result.success) {
          // Remove the comment from the comment map
          setCommentMap(prev => {
            const newMap = new Map(prev)
            newMap.delete(commentId)
            return newMap
          })
          
          // Also remove any replies to this comment
          setCommentMap(prev => {
            const newMap = new Map(prev)
            const commentsToRemove: string[] = []
            
            // Find all replies to this comment
            newMap.forEach((comment, id) => {
              if (comment.parentId === commentId) {
                commentsToRemove.push(id)
              }
            })
            
            // Remove all replies
            commentsToRemove.forEach(id => newMap.delete(id))
            return newMap
          })
          
          // Remove vote states for deleted comments
          setCommentVoteStates(prev => {
            const newStates = { ...prev }
            delete newStates[commentId]
            return newStates
          })
        } else {
          alert(`Failed to delete comment: ${result.error}`)
        }
      } catch (error) {
        console.error('Error deleting comment:', error)
        alert('Failed to delete comment')
      }
    }
  }, [isAuthenticated, user])

  const handleSortChange = (newSortType: SortType) => {
    if (sortType === newSortType) {
      // Toggle direction if clicking the same sort type
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')
    } else {
      // Set new sort type with default direction
      setSortType(newSortType)
      setSortDirection('desc')
    }
  }

  // Helper function to check if a comment is from the original poster
  const isOriginalPoster = useCallback((commentUserId: string) => {
    return commentUserId === article.userId
  }, [article.userId])

  // Callback for replying to a comment
  const handleReplyToComment = useCallback((comment: { id: string; author: string; text: string; depth?: number }) => {
    setReplyingTo(comment)
    setIsCommentFormMinimized(false)
  }, [])

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
                // Count all comments in the flattened map
                return commentMap.size
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
              Time
              {sortType === 'date' && (
                <span className={sortType === 'date' ? 'text-black' : 'text-gray-400'}>
                  {sortDirection === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                </span>
              )}
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
              {sortType === 'votes' && (
                <span className={sortType === 'votes' ? 'text-black' : 'text-gray-400'}>
                  {sortDirection === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                </span>
              )}
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
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                onVote={handleCommentVoteClick}
                onReply={handleReplyToComment}
                isVoting={isCommentVoting}
                isAuthenticated={isAuthenticated}
                isOriginalPoster={isOriginalPoster}
                getCommentVoteState={getCommentVoteState}
                getCommentChildren={getCommentChildren}
                onDeleteComment={handleDeleteComment}
                currentUserId={user?.$id}
              />
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

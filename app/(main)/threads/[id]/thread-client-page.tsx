"use client"

import { CommentForm } from "@/components/comment-form"
import { CommentVote } from "@/components/comment-vote"
import { useEffect, useState, useMemo, useCallback, memo } from "react"
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
  
  // Flattened vote state management
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
  
  const [isCommentVoting, setIsCommentVoting] = useState(false)
  const [isCommentFormMinimized, setIsCommentFormMinimized] = useState(false)
  const [sortType, setSortType] = useState<SortType>('date')
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
      // Sort by date (newest first) - keep original order for now
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
  }, [getRootComments, sortType, commentVoteStates])

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
            setCommentVoteStates(prev => {
              const newVoteStates = { ...prev }
              const processComment = (comment: Comment) => {
                newVoteStates[comment.id] = { currentVote: null, count: comment.count }
                if (comment.replies && comment.replies.length > 0) {
                  comment.replies.forEach(processComment)
                }
              }
              
              data.comments.forEach(processComment)
              return newVoteStates
            })
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

  const handleCommentVoteClick = async (commentId: string, direction: "up" | "down") => {
    if (!isAuthenticated) {
      return
    }
    
    if (isCommentVoting) {
      return
    }

    setIsCommentVoting(true)
    try {
      // Get current vote state for this comment
      const foundComment = commentMap.get(commentId)
      const currentVoteState = commentVoteStates[commentId] || { currentVote: null, count: foundComment?.count || 0 }
      
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
      setCommentVoteStates(prev => ({
        ...prev,
        [commentId]: optimisticState
      }))
      
      await handleVote(commentId, 'comment', direction, currentVoteState.currentVote, currentVoteState.count, (newState) => {
        // Update with actual server response
        setCommentVoteStates(prev => ({
          ...prev,
          [commentId]: newState
        }))
      })
    } catch (error) {
      console.error('Error handling comment vote:', error)
      // Revert optimistic update on error
      const originalComment = commentMap.get(commentId)
      setCommentVoteStates(prev => ({
        ...prev,
        [commentId]: commentVoteStates[commentId] || { currentVote: null, count: originalComment?.count || 0 }
      }))
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
  const CommentItem = memo(({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const canReply = depth < 2 // Allow replies up to depth 2 (3 levels total)
    
    const handleReplyClick = useCallback(() => {
      setReplyingTo({
        id: comment.id,
        author: comment.author,
        text: comment.text,
        depth: comment.depth || depth
      })
      setIsCommentFormMinimized(false)
    }, [comment.id, comment.author, comment.text, comment.depth, depth])
    
    const handleCommentVote = useCallback((commentId: string, direction: "up" | "down") => {
      handleCommentVoteClick(commentId, direction)
    }, [])
    
    // Get the current vote state for this specific comment - memoized to prevent re-renders
    const currentVoteState = useMemo(() => {
      return commentVoteStates[comment.id] || { currentVote: null, count: comment.count }
    }, [commentVoteStates[comment.id], comment.count])
    
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
              voteState={currentVoteState}
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
                <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }, (prevProps, nextProps) => {
    // Only re-render if this specific comment's data changed
    const prevComment = prevProps.comment
    const nextComment = nextProps.comment
    const commentId = prevComment.id
    
    // Re-render if this comment's vote state changed
    const prevVoteState = commentVoteStates[commentId]
    const nextVoteState = commentVoteStates[commentId]
    if (prevVoteState !== nextVoteState) {
      return false
    }
    
    // Re-render if this comment's content changed
    if (prevComment.text !== nextComment.text) {
      return false
    }
    
    // Re-render if this comment's children count changed (but not their content)
    const prevChildrenCount = getCommentChildren(commentId).length
    const nextChildrenCount = getCommentChildren(commentId).length
    if (prevChildrenCount !== nextChildrenCount) {
      return false
    }
    
    // Re-render if depth changed
    if (prevProps.depth !== nextProps.depth) {
      return false
    }
    
    // Re-render if author or userId changed
    if (prevComment.author !== nextComment.author || prevComment.userId !== nextComment.userId) {
      return false
    }
    
    // Don't re-render if only sibling or parent data changed
    return true
  })
  
  CommentItem.displayName = 'CommentItem'

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

"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CommentVote } from "@/components/comment-vote"
import { CommentForm } from "@/components/comment-form"
import { type Comment } from "@/lib/data"
import { type VoteState } from "@/lib/types"
import { useAuth } from "@/hooks/use-auth"
import { useIsMobile } from "@/hooks/use-mobile"
import { getCachedJWT } from "@/lib/jwtCache"
import { handleVote } from "@/lib/voteHandler"
import { deleteComment } from "@/lib/commentHandler"
import { ArrowUpDown, Clock, TrendingUp, Reply, X, Trash2 } from "lucide-react"
import { BotLabel } from "@/components/bot-label"
import { ParsedText } from "@/components/parsed-text"

interface CommentItemProps {
  comment: Comment
  onAddReply: (parentId: string, text: string) => void
  onVote: (commentId: string, direction: "up" | "down") => void
  voteState: VoteState
  isVoting: boolean
  isAuthenticated: boolean
  isOriginalPoster: boolean
  depth?: number
  onReplyToComment?: (commentId: string) => void // Add callback for replying to comment
  onDeleteComment?: (commentId: string) => void // Add callback for deleting comment
  currentUserId?: string // Add current user ID for ownership check
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  onAddReply, 
  onVote, 
  voteState, 
  isVoting, 
  isAuthenticated,
  isOriginalPoster,
  depth = 0,
  onReplyToComment,
  onDeleteComment,
  currentUserId
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState("")
  const isMobile = useIsMobile()

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (replyText.trim()) {
      onAddReply(comment.id, replyText.trim())
      setReplyText("")
      setShowReplyForm(false)
    }
  }

  const handleReplyToComment = () => {
    if (onReplyToComment) {
      onReplyToComment(comment.id)
    }
  }

  const handleDeleteComment = async () => {
    if (!onDeleteComment) return
    
    if (confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      onDeleteComment(comment.id)
    }
  }

  const maxDepth = 5 // Maximum nesting depth to prevent excessive indentation
  const currentDepth = Math.min(depth, maxDepth)

  return (
    <div className={`flex items-start gap-3 ${isMobile ? 'gap-1.5' : 'gap-3'}`}>
      {/* Vote Section for Comment */}
      <CommentVote
        commentId={comment.id}
        voteState={voteState}
        isVoting={isVoting}
        onVote={onVote}
        isAuthenticated={isAuthenticated}
        layout="vertical"
        size="sm"
      />

      <div className="flex-1">
        <div className={`flex items-center gap-2 text-sm ${isMobile ? 'gap-1 text-xs' : 'gap-2'}`}>
          <Avatar className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`}>
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${comment.author}`} />
            <AvatarFallback>{comment.author.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-gray-800">{comment.author}</span>
          {/* Bot detection logic - show for falsy values (0, empty string, undefined) */}
          {!comment.userId && (
            <BotLabel />
          )}
          {isOriginalPoster && (
            <>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500 text-xs">original poster</span>
            </>
          )}
          <span className="text-gray-500">•</span>
          <span className="text-gray-500 text-xs">{comment.timeAgo}</span>
          {/* Delete button - only show for comment owners */}
          {onDeleteComment && comment.userId && currentUserId && comment.userId === currentUserId && (
            <>
              <span className="text-gray-500">•</span>
              <button
                onClick={handleDeleteComment}
                className="text-xs text-red-600 hover:text-red-800 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                delete
              </button>
            </>
          )}

        </div>
        <ParsedText text={comment.text} />
        
        {/* Action Buttons */}
        <div className={`flex items-center gap-3 mt-2 ${isMobile ? 'gap-1.5 mt-1' : 'gap-3 mt-2'}`}>
          {/* Reply Button */}
          <Button
            variant="link"
            className="p-0 h-auto text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            onClick={() => setShowReplyForm(!showReplyForm)}
          >
            <Reply className="w-3 h-3" />
            {showReplyForm ? "Cancel" : "Reply"}
          </Button>

          {/* Reply to this comment from main form */}
          {onReplyToComment && (
            <Button
              variant="link"
              className="p-0 h-auto text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              onClick={handleReplyToComment}
            >
              Reply to this comment
            </Button>
          )}
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <form onSubmit={handleReplySubmit} className={`mt-3 mb-4 ${isMobile ? 'mt-1.5 mb-2' : 'mt-3 mb-4'}`}>
            <div className={`bg-blue-50 border border-blue-200 rounded-md p-3 mb-3 ${isMobile ? 'p-1.5 mb-1.5' : 'p-3 mb-3'}`}>
              <div className={`flex items-center gap-2 text-xs text-blue-700 mb-2 ${isMobile ? 'gap-1 mb-1' : 'gap-2 mb-2'}`}>
                <Reply className="w-3 h-3" />
                Replying to {comment.author}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-blue-600 hover:text-blue-800 ml-auto"
                  onClick={() => setShowReplyForm(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className={`mb-2 min-h-[60px] text-sm border-blue-200 focus:border-blue-400 ${isMobile ? 'mb-1 min-h-[40px] text-xs' : 'mb-2 min-h-[60px]'}`}
              />
              <Button type="submit" size="sm" className="bg-[#4e1cb3] hover:bg-[#5d2bc4]">
                Post Reply
              </Button>
            </div>
          </form>
        )}

        {/* Nested Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div 
            className={`mt-4 space-y-4 border-l border-gray-200 ${
              isMobile ? 'pl-1.5 mt-2 space-y-2' : 'pl-4'
            }`}
            style={{ 
              marginLeft: isMobile 
                ? `${Math.min(currentDepth * 6, 24)}px` 
                : `${currentDepth * 16}px` 
            }}
          >
            {comment.replies.map((reply) => (
              <CommentItem 
                key={reply.id} 
                comment={reply} 
                onAddReply={onAddReply} 
                onVote={onVote}
                voteState={{ currentVote: null, count: reply.count }}
                isVoting={false}
                isAuthenticated={isAuthenticated}
                isOriginalPoster={false}
                depth={currentDepth + 1}
                onReplyToComment={onReplyToComment}
                onDeleteComment={onDeleteComment}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface CommentsSectionProps {
  initialComments: Comment[]
  postId: string
  postUserId?: string
}

type SortType = 'date' | 'votes'

export function CommentsSection({ initialComments, postId, postUserId }: CommentsSectionProps) {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newCommentText, setNewCommentText] = useState("")
  const [sortType, setSortType] = useState<SortType>('date')
  const [commentVotes, setCommentVotes] = useState<Map<string, VoteState>>(new Map())
  const [votingComments, setVotingComments] = useState<Set<string>>(new Set())
  const [replyingTo, setReplyingTo] = useState<string | null>(null) // Track which comment we're replying to



  // Helper function to check if a comment is from the original poster
  const isOriginalPoster = (commentUserId: string) => {
    return postUserId && commentUserId === postUserId
  }

  // Sort comments based on current sort type
  const sortedComments = useMemo(() => {
    const sorted = [...comments]
    
    if (sortType === 'date') {
      // Sort by date (newest first) - assuming timeAgo is a string like "2 hours ago"
      // For now, we'll keep the original order since we don't have actual timestamps
      // In a real implementation, you'd want to store actual timestamps
      return sorted
    } else if (sortType === 'votes') {
      // Sort by vote count (highest first)
      return sorted.sort((a, b) => {
        const aScore = commentVotes.get(a.id)?.count ?? a.count
        const bScore = commentVotes.get(b.id)?.count ?? b.count
        return bScore - aScore
      })
    }
    
    return sorted
  }, [comments, sortType, commentVotes])

  // Initialize comment votes with default states
  useEffect(() => {
    const initialVotes = new Map<string, VoteState>()
    const addCommentVotes = (commentList: Comment[]) => {
      commentList.forEach(comment => {
        initialVotes.set(comment.id, { currentVote: null, count: comment.count })
        if (comment.replies) {
          addCommentVotes(comment.replies)
        }
      })
    }
    addCommentVotes(initialComments)
    setCommentVotes(initialVotes)
  }, [initialComments])

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newCommentText.trim()) {
      try {
        // Get JWT token for authentication
        const { getCachedJWT } = await import('@/lib/jwtCache')
        const jwt = await getCachedJWT()

        if (!jwt) {
          console.error('Authentication token not found')
          return
        }

        const response = await fetch('/api/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
          },
          body: JSON.stringify({
            postId,
            text: newCommentText.trim(),
            userName: user?.name || 'Anonymous',
            replyId: replyingTo || undefined
          })
        })

        if (response.ok) {
          // Clear form and reset reply state
          setNewCommentText("")
          setReplyingTo(null)
          // Refresh the page to show the new comment
          window.location.reload()
        } else {
          console.error('Error posting comment:', response.statusText)
        }
      } catch (error) {
        console.error('Error posting comment:', error)
      }
    }
  }

  const handleAddReply = async (parentId: string, text: string) => {
    try {
      // Get JWT token for authentication
      const { getCachedJWT } = await import('@/lib/jwtCache')
      const jwt = await getCachedJWT()

      if (!jwt) {
        console.error('Authentication token not found')
        return
      }

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          postId,
          text: text,
          userName: user?.name || 'Anonymous',
          replyId: parentId
        })
      })

      if (response.ok) {
        // Refresh the page to show the new reply
        window.location.reload()
      } else {
        console.error('Error posting reply:', response.statusText)
      }
    } catch (error) {
      console.error('Error posting reply:', error)
    }
  }

  const handleCommentVote = useCallback(async (commentId: string, direction: "up" | "down") => {
    if (!user) {
      return
    }

    setVotingComments(prev => new Set(prev).add(commentId))
    
    try {
      // Get current vote state
      const currentVoteState = commentVotes.get(commentId) || { currentVote: null, count: 0 }
      
      // Use the unified handleVote function
      await handleVote(
        commentId, 
        'comment', 
        direction, 
        currentVoteState.currentVote, 
        currentVoteState.count, 
        (newState: VoteState) => {
          // Update local state with the new vote state
          setCommentVotes(prev => new Map(prev).set(commentId, newState))
        }
      )
      
    } catch (error) {
      // Revert on error
      const currentVoteState = commentVotes.get(commentId) || { currentVote: null, count: 0 }
      setCommentVotes(prev => new Map(prev).set(commentId, currentVoteState))
    } finally {
      setVotingComments(prev => {
        const newSet = new Set(prev)
        newSet.delete(commentId)
        return newSet
      })
    }
  }, [commentVotes, user])

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!user) {
      return
    }

    try {
      const result = await deleteComment(commentId)
      if (result.success) {
        // Remove the comment from local state
        const removeComment = (comments: Comment[], targetId: string): Comment[] => {
          return comments.filter(comment => {
            if (comment.id === targetId) {
              return false
            }
            if (comment.replies && comment.replies.length > 0) {
              comment.replies = removeComment(comment.replies, targetId)
            }
            return true
          })
        }
        
        setComments(prev => removeComment(prev, commentId))
      } else {
        alert(`Failed to delete comment: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment')
    }
  }, [user])

  const handleSortChange = (newSortType: SortType) => {
    setSortType(newSortType)
  }

  const cancelReply = () => {
    setReplyingTo(null)
  }

  // Helper function to find a comment by ID in the nested structure
  const findCommentById = (commentId: string, commentList: Comment[]): Comment | null => {
    for (const comment of commentList) {
      if (comment.id === commentId) {
        return comment
      }
      if (comment.replies && comment.replies.length > 0) {
        const found = findCommentById(commentId, comment.replies)
        if (found) return found
      }
    }
    return null
  }

  return (
    <div className={`bg-white rounded-lg border-none shadow-none ${isMobile ? 'p-2' : 'p-6'}`}>
      <div className={`flex items-center justify-between mb-4 ${isMobile ? 'flex-col items-start gap-1 mb-2' : 'mb-4'}`}>
        <h2 className={`text-lg font-semibold font-heading ${isMobile ? 'text-base' : 'text-lg'}`}>Comments ({comments.length})</h2>
        
        {/* Sort Buttons */}
        <div className={`flex items-center gap-2 ${isMobile ? 'flex-col items-start gap-1' : ''}`}>
          <span className={`text-xs text-gray-500 mr-2 ${isMobile ? 'mr-0 mb-1 text-[10px]' : 'mr-2'}`}>Sort by:</span>
          <div className={`flex items-center gap-2 ${isMobile ? 'flex-col gap-1' : ''}`}>
            <Button
              variant={sortType === 'date' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange('date')}
              className={`flex items-center gap-2 ${isMobile ? 'text-xs px-1.5 py-0.5 h-6' : ''}`}
            >
              <Clock className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              Date
            </Button>
            <Button
              variant={sortType === 'votes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange('votes')}
              className={`flex items-center gap-2 ${isMobile ? 'text-xs px-1.5 py-0.5 h-6' : ''}`}
            >
              <TrendingUp className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              Votes
            </Button>
          </div>
        </div>
      </div>

      {/* Comment Input */}
      <form onSubmit={handleAddComment} className={`mb-6 ${isMobile ? 'mb-3' : 'mb-6'}`}>
        {replyingTo && (
          <div className={`bg-blue-50 border border-blue-200 rounded-md p-3 mb-3 ${isMobile ? 'p-1.5 mb-1.5' : 'p-3 mb-3'}`}>
            <div className={`flex items-center gap-2 text-xs text-blue-700 mb-2 ${isMobile ? 'gap-1 mb-1' : 'gap-2 mb-2'}`}>
              <Reply className="w-3 h-3" />
              Replying to {findCommentById(replyingTo, comments)?.author || 'a comment'}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-blue-600 hover:text-blue-800 ml-auto"
                onClick={cancelReply}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className={`text-xs text-blue-600 bg-blue-100 p-2 rounded border-l-2 border-blue-300 ${isMobile ? 'p-1 text-[10px]' : 'p-2'}`}>
              "{findCommentById(replyingTo, comments)?.text || ''}"
            </div>
          </div>
        )}
        <Textarea
          placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          className={`mb-3 min-h-[80px] ${isMobile ? 'mb-1.5 min-h-[60px] text-sm' : 'mb-3 min-h-[80px]'}`}
        />
        <div className={`flex gap-2 ${isMobile ? 'flex-col gap-1.5' : ''}`}>
          <Button type="submit" className="bg-[#4e1cb3] hover:bg-[#5d2bc4]">
            {replyingTo ? "Post Reply" : "Post Comment"}
          </Button>
          {replyingTo && (
            <Button type="button" variant="outline" onClick={cancelReply}>
              Cancel Reply
            </Button>
          )}
        </div>
      </form>

      {/* Comments List */}
      <div className={`space-y-5 ${isMobile ? 'space-y-2' : 'space-y-5'}`}>
        {sortedComments.length === 0 ? (
          <p className="text-gray-500 text-sm">No comments yet. Be the first to share your thoughts!</p>
        ) : (
          sortedComments.map((comment) => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              onAddReply={handleAddReply} 
              onVote={handleCommentVote}
              voteState={commentVotes.get(comment.id) || { currentVote: null, count: comment.count }}
              isVoting={votingComments.has(comment.id)}
              isAuthenticated={!!user}
              isOriginalPoster={Boolean(isOriginalPoster(comment.userId || ''))}
              depth={comment.depth || 0}
              onReplyToComment={(commentId) => setReplyingTo(commentId)}
              onDeleteComment={handleDeleteComment}
              currentUserId={user?.$id}
            />
          ))
        )}
      </div>

      {/* Main Comment Form */}
      <div className={`mt-8 ${isMobile ? 'mt-4' : 'mt-8'}`}>
        <CommentForm 
          postId={postId}
          onCommentAdded={() => {
            // Refresh comments or handle comment added
            window.location.reload() // Simple refresh for now
          }}
        />
      </div>
    </div>
  )
}

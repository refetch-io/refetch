"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CommentVote } from "@/components/comment-vote"
import { type Comment } from "@/lib/data"
import { type VoteState } from "@/lib/types"
import { useAuth } from "@/hooks/use-auth"
import { getCachedJWT } from "@/lib/jwtCache"
import { ArrowUpDown, Clock, TrendingUp } from "lucide-react"

interface CommentItemProps {
  comment: Comment
  onAddReply: (parentId: string, text: string) => void
  onVote: (commentId: string, direction: "up" | "down") => void
  voteState: VoteState
  isVoting: boolean
  isAuthenticated: boolean
  isOriginalPoster: boolean
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  onAddReply, 
  onVote, 
  voteState, 
  isVoting, 
  isAuthenticated,
  isOriginalPoster
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState("")

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (replyText.trim()) {
      onAddReply(comment.id, replyText.trim())
      setReplyText("")
      setShowReplyForm(false)
    }
  }

  return (
    <div className="flex items-start gap-3">
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
        <div className="flex items-center gap-2 text-sm">
          <Avatar className="w-6 h-6">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${comment.author}`} />
            <AvatarFallback>{comment.author.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-gray-800">{comment.author}</span>
          {isOriginalPoster && (
            <>
              <span className="text-gray-500">•</span>
              <span className="text-gray-500 text-xs">original poster</span>
            </>
          )}
          <span className="text-gray-500">• {comment.timeAgo}</span>
        </div>
        <p className="text-gray-700 mt-1 text-sm">{comment.text}</p>
        <Button
          variant="link"
          className="p-0 h-auto text-xs text-gray-500 hover:text-gray-700"
          onClick={() => setShowReplyForm(!showReplyForm)}
        >
          {showReplyForm ? "Cancel" : "Reply"}
        </Button>

        {showReplyForm && (
          <form onSubmit={handleReplySubmit} className="mt-3 mb-4">
            <Textarea
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="mb-2 min-h-[60px] text-sm"
            />
            <Button type="submit" size="sm" className="bg-[#4e1cb3] hover:bg-[#5d2bc4]">
              Post Reply
            </Button>
          </form>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-6 mt-4 space-y-5 border-l pl-4 border-gray-200">
            {comment.replies.map((reply) => (
              <CommentItem 
                key={reply.id} 
                comment={reply} 
                onAddReply={onAddReply} 
                onVote={onVote}
                voteState={{ currentVote: null, count: reply.count }}
                isVoting={false}
                isAuthenticated={isAuthenticated}
                isOriginalPoster={false} // Replies don't have original poster status
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
  postUserId?: string // Add postUserId to identify original poster
}

type SortType = 'date' | 'votes'

export function CommentsSection({ initialComments, postId, postUserId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newCommentText, setNewCommentText] = useState("")
  const [commentVotes, setCommentVotes] = useState<Map<string, VoteState>>(new Map())
  const [isVoting, setIsVoting] = useState(false)
  const [sortType, setSortType] = useState<SortType>('date')
  const { user } = useAuth()

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

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (newCommentText.trim()) {
      const newComment: Comment = {
        id: `c${Date.now()}`,
        author: "You", // Assuming the current user is "You"
        text: newCommentText.trim(),
        timeAgo: "just now",
        count: 1, // Default score for new comments
        replies: [],
        userId: user?.$id || '', // Include userId for original poster detection
      }
      setComments((prev) => [newComment, ...prev])
      // Add default vote state for new comment
      setCommentVotes(prev => new Map(prev).set(newComment.id, { currentVote: null, count: 1 }))
      setNewCommentText("")
    }
  }

  const handleAddReply = (parentId: string, text: string) => {
    const newReply: Comment = {
      id: `c${Date.now()}-${Math.random()}`,
      author: "You",
      text: text,
      timeAgo: "just now",
      count: 1,
      replies: [],
      userId: user?.$id || '', // Include userId for original poster detection
    }

    const addReplyRecursive = (currentComments: Comment[]): Comment[] => {
      return currentComments.map((comment) => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: comment.replies ? [newReply, ...comment.replies] : [newReply],
          }
        } else if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: addReplyRecursive(comment.replies),
          }
        }
        return comment
      })
    }
    setComments((prev) => addReplyRecursive(prev))
    // Add default vote state for new reply
    setCommentVotes(prev => new Map(prev).set(newReply.id, { currentVote: null, count: 1 }))
  }

  const handleVote = async (commentId: string, direction: "up" | "down") => {
    if (!user) return

    setIsVoting(true)
    try {
      // Get current vote state
      const currentVoteState = commentVotes.get(commentId) || { currentVote: null, count: 0 }
      
      // Optimistic update
      const newVoteState = { ...currentVoteState }
      if (currentVoteState.currentVote === direction) {
        // Removing vote
        newVoteState.currentVote = null
        newVoteState.count = currentVoteState.count - (direction === "up" ? 1 : -1)
      } else if (currentVoteState.currentVote === null) {
        // New vote
        newVoteState.currentVote = direction
        newVoteState.count = currentVoteState.count + (direction === "up" ? 1 : -1)
      } else {
        // Changing vote
        const previousVoteValue = currentVoteState.currentVote === 'up' ? 1 : -1
        const newVoteValue = direction === 'up' ? 1 : -1
        newVoteState.currentVote = direction
        newVoteState.count = currentVoteState.count - previousVoteValue + newVoteValue
      }

      // Update local state immediately
      setCommentVotes(prev => new Map(prev).set(commentId, newVoteState))

      // Get JWT token
      const jwt = await getCachedJWT()
      if (!jwt) {
        throw new Error('No JWT token available')
      }

      // Make API call
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          resourceId: commentId,
          resourceType: 'comment',
          voteType: direction
        })
      })

      if (!response.ok) {
        // Revert on error
        setCommentVotes(prev => new Map(prev).set(commentId, currentVoteState))
        console.error('Vote failed')
      }
    } catch (error) {
      console.error('Error voting:', error)
      // Revert on error
      const currentVoteState = commentVotes.get(commentId) || { currentVote: null, count: 0 }
      setCommentVotes(prev => new Map(prev).set(commentId, currentVoteState))
    } finally {
      setIsVoting(false)
    }
  }

  const handleSortChange = (newSortType: SortType) => {
    setSortType(newSortType)
  }

  return (
    <div className="bg-white p-6 rounded-lg border-none shadow-none">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold font-heading">Comments ({comments.length})</h2>
        
        {/* Sort Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 mr-2">Sort by:</span>
          <Button
            variant={sortType === 'date' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange('date')}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Date
          </Button>
          <Button
            variant={sortType === 'votes' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange('votes')}
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Votes
          </Button>
        </div>
      </div>

      {/* Comment Input */}
      <form onSubmit={handleAddComment} className="mb-6">
        <Textarea
          placeholder="Write a comment..."
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          className="mb-3 min-h-[80px]"
        />
        <Button type="submit" className="bg-[#4e1cb3] hover:bg-[#5d2bc4]">
          Post Comment
        </Button>
      </form>

      {/* Comments List */}
      <div className="space-y-5">
        {sortedComments.length === 0 ? (
          <p className="text-gray-500 text-sm">No comments yet. Be the first to share your thoughts!</p>
        ) : (
          sortedComments.map((comment) => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              onAddReply={handleAddReply} 
              onVote={handleVote}
              voteState={commentVotes.get(comment.id) || { currentVote: null, count: comment.count }}
              isVoting={isVoting}
              isAuthenticated={!!user}
              isOriginalPoster={Boolean(isOriginalPoster(comment.userId || ''))}
            />
          ))
        )}
      </div>
    </div>
  )
}

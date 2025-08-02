"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronUp, ChevronDown } from "lucide-react"
import type { Comment } from "@/lib/data" // Import Comment type

interface CommentItemProps {
  comment: Comment
  onAddReply: (parentId: string, text: string) => void
  onVote: (commentId: string, direction: "up" | "down") => void
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onAddReply, onVote }) => {
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
      <div className="flex flex-col items-center justify-center text-gray-500 mt-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 hover:bg-gray-100"
          onClick={() => onVote(comment.id, "up")}
          aria-label={`Upvote comment by ${comment.author}`}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <span className="text-[0.65rem] text-gray-600">{comment.score}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 hover:bg-gray-100"
          onClick={() => onVote(comment.id, "down")}
          aria-label={`Downvote comment by ${comment.author}`}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm">
          <Avatar className="w-6 h-6">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${comment.author}`} />
            <AvatarFallback>{comment.author.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-gray-800">{comment.author}</span>
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
              <CommentItem key={reply.id} comment={reply} onAddReply={onAddReply} onVote={onVote} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface CommentsSectionProps {
  initialComments: Comment[]
}

export function CommentsSection({ initialComments }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newCommentText, setNewCommentText] = useState("")

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (newCommentText.trim()) {
      const newComment: Comment = {
        id: `c${Date.now()}`,
        author: "You", // Assuming the current user is "You"
        text: newCommentText.trim(),
        timeAgo: "just now",
        score: 1, // Default score for new comments
        replies: [],
      }
      setComments((prev) => [newComment, ...prev])
      setNewCommentText("")
    }
  }

  const handleAddReply = (parentId: string, text: string) => {
    const newReply: Comment = {
      id: `c${Date.now()}-${Math.random()}`,
      author: "You",
      text: text,
      timeAgo: "just now",
      score: 1,
      replies: [],
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
  }

  const handleVote = (commentId: string, direction: "up" | "down") => {
    const updateVoteRecursive = (currentComments: Comment[]): Comment[] => {
      return currentComments.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            score: direction === "up" ? comment.score + 1 : comment.score - 1,
          }
        } else if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateVoteRecursive(comment.replies),
          }
        }
        return comment
      })
    }
    setComments((prev) => updateVoteRecursive(prev))
  }

  return (
    <div className="bg-white p-6 rounded-lg border-none shadow-none">
      <h2 className="text-lg font-semibold mb-4 font-heading">Comments ({comments.length})</h2>

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
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm">No comments yet. Be the first to share your thoughts!</p>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} onAddReply={handleAddReply} onVote={handleVote} />
          ))
        )}
      </div>
    </div>
  )
}

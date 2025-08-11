"use client"

import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import { type VoteState } from "@/lib/voteHandler"

interface CommentVoteProps {
  commentId: string
  voteState: VoteState
  isVoting: boolean
  onVote: (commentId: string, direction: "up" | "down") => void
  isAuthenticated: boolean
  layout?: "vertical" | "horizontal"
  size?: "sm" | "md"
}

export function CommentVote({ 
  commentId, 
  voteState, 
  isVoting, 
  onVote, 
  isAuthenticated, 
  layout = "vertical",
  size = "sm"
}: CommentVoteProps) {
  const isVertical = layout === "vertical"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"
  const buttonSize = size === "sm" ? "h-4 w-4" : "h-5 w-5"
  const scoreTextSize = size === "sm" ? "text-[0.65rem]" : "text-xs"

  const handleVote = async (direction: "up" | "down") => {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    await onVote(commentId, direction)
  }

  if (isVertical) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-500 w-6 self-center">
        <Button
          variant="ghost"
          size="icon"
          className={`${buttonSize} ${
            voteState.currentVote === 'up' 
              ? 'text-green-600 bg-green-50 hover:bg-green-50' 
              : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
          }`}
          onClick={() => handleVote("up")}
          disabled={isVoting}
          aria-label={`Upvote comment`}
        >
          <ChevronUp className={iconSize} />
        </Button>
        <span className={`${scoreTextSize} text-gray-700 font-medium`}>
          {voteState.score}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className={`${buttonSize} ${
            voteState.currentVote === 'down' 
              ? 'text-red-600 bg-red-50 hover:bg-red-50' 
              : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
          }`}
          onClick={() => handleVote("down")}
          disabled={isVoting}
          aria-label={`Downvote comment`}
        >
          <ChevronDown className={iconSize} />
        </Button>
      </div>
    )
  }

  // Horizontal layout
  return (
    <div className="flex items-center gap-0 text-gray-500">
      <Button
        variant="ghost"
        size="icon"
        className={`${buttonSize} ${
          voteState.currentVote === 'up' 
            ? 'text-green-600 bg-green-50 hover:bg-green-50' 
            : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
        }`}
        onClick={() => handleVote("up")}
        disabled={isVoting}
        aria-label={`Upvote comment`}
      >
        <ChevronUp className={iconSize} />
      </Button>
      <span className={`${scoreTextSize} text-gray-700 font-medium min-w-[1.5rem] text-center mx-0`}>
        {voteState.score}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={`${buttonSize} ${
          voteState.currentVote === 'down' 
            ? 'text-red-600 bg-red-50 hover:bg-red-50' 
              : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
        }`}
        onClick={() => handleVote("down")}
        disabled={isVoting}
        aria-label={`Downvote comment`}
      >
        <ChevronDown className={iconSize} />
      </Button>
    </div>
  )
}

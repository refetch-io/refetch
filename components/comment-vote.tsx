"use client"

import { VoteButtons } from "@/components/vote-buttons"
import { type VoteState } from "@/lib/types"

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
  return (
    <VoteButtons
      resourceId={commentId}
      resourceType="comment"
      voteState={voteState}
      isVoting={isVoting}
      onVote={onVote}
      isAuthenticated={isAuthenticated}
      layout={layout}
      size={size}
    />
  )
}

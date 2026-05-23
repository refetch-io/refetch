import { useState } from "react"
import { ArrowBigDown, ArrowBigUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Vote = "up" | "down" | null

export type FeedVoteAppearance = "rail" | "inline" | "minimal" | "bold"

type FeedVoteProps = {
  postId: string
  initialScore: number
  className?: string
  appearance?: FeedVoteAppearance
}

function VoteButton({
  direction,
  active,
  onClick,
  className,
}: {
  direction: "up" | "down"
  active: boolean
  onClick: () => void
  className?: string
}) {
  const Icon = direction === "up" ? ArrowBigUp : ArrowBigDown
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      aria-label={direction === "up" ? "Upvote" : "Downvote"}
      className={cn(
        "text-muted-foreground hover:bg-transparent size-8 rounded-md",
        direction === "up" &&
          active &&
          "text-[var(--feed-up)] hover:text-[var(--feed-up)] bg-[var(--feed-up)]/10",
        direction === "down" &&
          active &&
          "text-[var(--feed-down)] hover:text-[var(--feed-down)] bg-[var(--feed-down)]/10",
        className,
      )}
    >
      <Icon className={cn("size-5", active && "fill-current")} strokeWidth={1.75} />
    </Button>
  )
}

export function FeedVote({
  postId,
  initialScore,
  className,
  appearance = "rail",
}: FeedVoteProps) {
  const [vote, setVote] = useState<Vote>(null)
  const [score, setScore] = useState(initialScore)

  const voteUp = () => {
    if (vote === "up") {
      setVote(null)
      setScore((s) => s - 1)
      return
    }
    setScore((s) => s + (vote === "down" ? 2 : 1))
    setVote("up")
  }

  const voteDown = () => {
    if (vote === "down") {
      setVote(null)
      setScore((s) => s + 1)
      return
    }
    setScore((s) => s - (vote === "up" ? 2 : 1))
    setVote("down")
  }

  const scoreClass = cn(
    "text-xs font-semibold tabular-nums leading-none",
    vote === "up" && "text-[var(--feed-up)]",
    vote === "down" && "text-[var(--feed-down)]",
    vote === null && "text-muted-foreground",
  )

  if (appearance === "inline") {
    return (
      <div
        className={cn("flex shrink-0 items-center gap-0.5", className)}
        data-post-id={postId}
      >
        <VoteButton direction="up" active={vote === "up"} onClick={voteUp} className="size-7" />
        <span className={cn(scoreClass, "min-w-[2ch] text-center")}>{score}</span>
        <VoteButton
          direction="down"
          active={vote === "down"}
          onClick={voteDown}
          className="size-7"
        />
      </div>
    )
  }

  if (appearance === "minimal") {
    return (
      <div
        className={cn("flex shrink-0 flex-col items-center justify-center gap-0.5 px-1", className)}
        data-post-id={postId}
      >
        <VoteButton direction="up" active={vote === "up"} onClick={voteUp} className="size-7" />
        <span className={scoreClass}>{score}</span>
        <VoteButton direction="down" active={vote === "down"} onClick={voteDown} className="size-7" />
      </div>
    )
  }

  if (appearance === "bold") {
    return (
      <div
        className={cn("flex flex-col items-center justify-center gap-2 px-2 py-3", className)}
        data-post-id={postId}
      >
        <span className="text-foreground text-xl font-semibold tabular-nums">{score}</span>
        <div className="flex flex-col gap-1">
          <VoteButton direction="up" active={vote === "up"} onClick={voteUp} />
          <VoteButton direction="down" active={vote === "down"} onClick={voteDown} />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "bg-muted/25 flex w-11 shrink-0 flex-col items-center justify-center gap-0.5 py-2",
        className,
      )}
      data-post-id={postId}
    >
      <VoteButton direction="up" active={vote === "up"} onClick={voteUp} />
      <span className={scoreClass}>{score}</span>
      <VoteButton direction="down" active={vote === "down"} onClick={voteDown} />
    </div>
  )
}

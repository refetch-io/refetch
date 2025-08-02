"use client"
import Link from "next/link"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CommentsSection } from "@/components/comments-section"
import { getArticleById } from "@/lib/data"
import { handleVote } from "@/lib/voteHandler"
import { Favicon } from "@/components/favicon"
import { use } from "react"

interface ThreadPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ThreadPage({ params }: ThreadPageProps) {
  const unwrappedParams = use(params)
  const article = getArticleById(unwrappedParams.id)

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Thread Not Found</h1>
        <p className="text-gray-600 mb-6">The thread you are looking for does not exist.</p>
        <Link href="/" passHref>
          <Button className="bg-[#4e1cb3] hover:bg-[#5d2bc4]">
            Back to Home
          </Button>
        </Link>
      </div>
    )
  }

  // Ensure IconComponent is a valid React component before rendering
  const IconComponent = article.icon

  return (
    <main className="flex-1 space-y-6 min-w-0">
            {/* Article Card - Same structure as main page */}
            <div className="bg-white px-4 py-2 rounded-lg border-none shadow-none w-full flex">
              {/* Upvote/Downvote Section */}
              <div className="flex flex-col items-center justify-center mr-4 text-gray-500 w-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-gray-100"
                  onClick={() => handleVote(article.id, "up")}
                  aria-label={`Upvote ${article.title}`}
                >
                  <ChevronUp className="h-5 w-5" />
                </Button>
                <span className="text-sm text-gray-600">{article.score}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-gray-100"
                  onClick={() => handleVote(article.id, "down")}
                  aria-label={`Downvote ${article.title}`}
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>

              {/* Article Content */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <h3
                  className="font-medium text-gray-900 mb-1 font-heading whitespace-nowrap overflow-hidden text-ellipsis text-lg"
                  title={article.title}
                >
                  {article.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {/* Render the favicon for the domain */}
                  <Favicon domain={article.domain} size={20} className="rounded" />
                  <span>{article.domain}</span>
                  {article.daysAgo && (
                    <>
                      <span>•</span>
                      <span>{article.daysAgo}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <CommentsSection initialComments={article.comments} />
          </main>
  )
} 
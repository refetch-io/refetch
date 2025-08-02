"use client"
import Link from "next/link"
import Image from "next/image"
import { ChevronUp, ChevronDown, Search, ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LeftSidebar } from "@/components/left-sidebar"
import { BackToTopButton } from "@/components/back-to-top-button"
import { CommentsSection } from "@/components/comments-section"
import { getArticleById } from "@/lib/data"
import { handleVote } from "@/lib/voteHandler"

interface ArticlePageProps {
  params: {
    id: string
  }
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const article = getArticleById(params.id)

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-100 font-body flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h1>
        <p className="text-gray-600 mb-6">The article you are looking for does not exist.</p>
        <Link href="/" passHref>
          <Button className="bg-[#4e1cb3] hover:bg-[#5d2bc4]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    )
  }

  // Ensure IconComponent is a valid React component before rendering
  const IconComponent = article.icon

  return (
    <div className="min-h-screen bg-gray-100 font-body">
      {/* Header - Fixed to Top */}
      <header className="bg-[#4e1cb3] text-white py-2 fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center sm:justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" passHref>
              <Image src="/logo.png" alt="Refetch Logo" width={102} height={23} className="rounded cursor-pointer" style={{ width: '102px', height: '23px' }} />
            </Link>
          </div>

          <div className="flex-1 flex justify-center mx-0 sm:mx-6 mt-2 sm:mt-0">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search"
                className="pl-10 bg-[#5d2bc4] border-[#5d2bc4] text-white placeholder:text-purple-200 h-8"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <Button variant="ghost" className="text-white hover:bg-[#5d2bc4] h-8 px-3 text-sm">
              Sign In
            </Button>
            {/* Removed separator and Sign Up button */}
          </div>
        </div>
      </header>

      {/* Main content wrapper with padding to account for fixed header */}
      <div className="max-w-7xl mx-auto flex flex-wrap gap-4 lg:gap-6 px-4 sm:px-6 pt-[60px] pb-[50px]">
        {/* Left Sidebar */}
        <LeftSidebar />

        {/* Main Content Area (single column) */}
        <div className="flex-1 flex flex-col pt-0 lg:pt-4 mt-0 lg:mt-10 min-w-0">
          <main className="flex-1 space-y-6 min-w-0">
            {/* Article Content Card */}
            <div className="bg-white p-6 rounded-lg border-none shadow-none">
              {/* Subtle Back to Home Link */}
              <Link href="/" passHref className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span>Back to Home</span>
              </Link>

              <div className="flex items-start gap-4 mb-4">
                {/* Upvote/Downvote Section */}
                <div className="flex flex-col items-center justify-center text-gray-500">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-gray-100"
                    onClick={() => handleVote(article.id, "up")}
                    aria-label={`Upvote ${article.title}`}
                  >
                    <ChevronUp className="h-5 w-5" />
                  </Button>
                  <span className="text-lg font-bold text-gray-800">{article.score}</span>
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

                {/* Article Header */}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2 font-heading">{article.title}</h1>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    {/* Conditionally render IconComponent to prevent errors if it's undefined */}
                    {IconComponent && (
                      <div
                        className={`w-5 h-5 flex items-center justify-center ${article.bgColorClass} ${article.shapeClass}`}
                      >
                        <IconComponent className="w-3 h-3 text-white" />
                      </div>
                    )}
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

              {/* Extended Highlight */}
              <p className="text-gray-700 leading-relaxed mb-6">{article.extendedHighlight}</p>

              {/* Placeholder for full article content */}
              <div className="bg-gray-50 p-4 rounded-md text-gray-600 text-sm italic">
                <p>
                  [Full article content would be displayed here. This is a placeholder for the actual article text from{" "}
                  {article.domain}.]
                </p>
                <p className="mt-2">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
                  dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
                  aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
                  dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
                  officia deserunt mollit anim id est laborum.
                </p>
                <p className="mt-2">
                  Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo
                  pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu
                  nibh egestas adipiscing.
                </p>
              </div>
            </div>

            {/* Comments Section */}
            <CommentsSection initialComments={article.comments} />
          </main>
        </div>
      </div>
      <BackToTopButton />
    </div>
  )
}

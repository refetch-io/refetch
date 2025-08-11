"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Favicon } from "@/components/favicon"
import { ExternalLink } from "lucide-react"
import { CommentForm } from "@/components/comment-form"
import { useEffect, useState } from "react"
import type { NewsItem, Comment } from "@/lib/data"

interface ThreadPageProps {
  params: Promise<{
    id: string
  }>
}

// Helper function to clean domain for display (remove www prefix)
const cleanDomainForDisplay = (domain: string) => {
  return domain.replace(/^www\./, '')
}

// Client-side function to fetch post by ID
const fetchPostById = async (id: string): Promise<NewsItem | null> => {
  try {
    console.log(`Client: Fetching post with ID: ${id}`)
    const response = await fetch(`/api/posts/${id}`)
    console.log(`Client: Response status: ${response.status}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('Client: Post not found (404)')
        return null
      }
      const errorText = await response.text()
      console.error('Client: HTTP error response:', errorText)
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('Client: Successfully fetched post:', { id: data.id, title: data.title, commentsCount: data.comments?.length || 0 })
    return data
  } catch (error) {
    console.error('Client: Error fetching post:', error)
    throw error
  }
}

export default function ThreadPage({ params }: ThreadPageProps) {
  const [article, setArticle] = useState<NewsItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadArticle = async () => {
      try {
        setLoading(true)
        setError(null)
        const unwrappedParams = await params
        const fetchedArticle = await fetchPostById(unwrappedParams.id)
        setArticle(fetchedArticle)
      } catch (error) {
        console.error('Error loading article:', error)
        setError(error instanceof Error ? error.message : 'Failed to load article')
      } finally {
        setLoading(false)
      }
    }

    loadArticle()
  }, [params])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-600">Loading thread...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Thread</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link href="/" passHref>
          <Button className="bg-[#4e1cb3] hover:bg-[#5d2bc4]">
            Back to Home
          </Button>
        </Link>
      </div>
    )
  }

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

  // Determine if this item has an external link
  const hasExternalLink = article.link && article.link.startsWith('http')
  const titleLinkHref = hasExternalLink && article.link ? `${article.link}${article.link.includes('?') ? '&' : '?'}ref=refetch.io` : `/threads/${article.id}`

  const handleCommentAdded = () => {
    // Refresh the article data to show the new comment
    // This is a simple approach - in a real app you might want to use SWR or React Query
    window.location.reload()
  }

  return (
    <main className="w-full space-y-6">
      {/* Article Card */}
      <div className="bg-white px-4 py-2 rounded-lg border-none shadow-none flex">
        {/* Voting Section - Static display only */}
        <div className="flex flex-col items-center justify-center mr-4 text-gray-500 w-8">
          <div className="h-5 w-5 text-gray-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </div>
          <span className="text-[0.65rem] text-gray-700 font-medium">
            {article.score}
          </span>
          <div className="h-5 w-5 text-gray-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Article Content */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {/* Title with external link */}
          <div className="flex items-center gap-2 mb-1">
            {article.type === "show" && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-600 rounded-md whitespace-nowrap">
                Show RF
              </span>
            )}
            <Link 
              href={titleLinkHref} 
              target={hasExternalLink ? '_blank' : undefined} 
              rel={hasExternalLink ? 'noopener noreferrer' : undefined}
              className="font-medium text-gray-900 font-heading whitespace-nowrap overflow-hidden text-ellipsis flex-1 hover:text-blue-600 transition-colors cursor-pointer"
              title={article.title}
            >
              {article.title}
            </Link>
            {hasExternalLink && (
              <ExternalLink className="h-3 w-3 text-gray-400" />
            )}
          </div>
          
          {/* Meta information */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Favicon domain={article.domain} size={16} className="rounded" />
            <span>{cleanDomainForDisplay(article.domain)}</span>
            {article.daysAgo && (
              <>
                <span>•</span>
                <span>{article.daysAgo}</span>
              </>
            )}
            <span>•</span>
            <span>{article.author}</span>
            <span>•</span>
            <span>{article.comments.length} comments</span>
          </div>
        </div>
      </div>

      {/* Comment Form */}
      <CommentForm postId={article.id} onCommentAdded={handleCommentAdded} />

      {/* Comments Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Comments ({article.comments.length})</h2>
        
        {article.comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
        ) : (
          <div className="space-y-6">
            {article.comments.map((comment: Comment) => (
              <div key={comment.id} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  {/* Comment Header */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                        {comment.author.charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-800">{comment.author}</span>
                      <span className="text-gray-500">• {comment.timeAgo}</span>
                      <span className="text-gray-500">• {comment.score} points</span>
                    </div>
                    <p className="text-gray-700 text-sm">{comment.text}</p>
                    
                    {/* Nested Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-6 mt-4 space-y-4 border-l pl-4 border-gray-200">
                        {comment.replies.map((reply: Comment) => (
                          <div key={reply.id} className="bg-gray-50 p-3 rounded">
                            <div className="flex items-center gap-2 text-sm mb-2">
                              <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                                {reply.author.charAt(0)}
                              </div>
                              <span className="font-semibold text-gray-800">{reply.author}</span>
                              <span className="text-gray-500">• {reply.timeAgo}</span>
                              <span className="text-gray-500">• {reply.score} points</span>
                            </div>
                            <p className="text-gray-700 text-sm">{reply.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
} 
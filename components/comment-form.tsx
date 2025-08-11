"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { ChevronUp, ChevronDown } from "lucide-react"

interface CommentFormProps {
  postId: string
  onCommentAdded?: () => void
  isFixed?: boolean
  onHeightChange?: (height: number) => void
}

export function CommentForm({ postId, onCommentAdded, isFixed = false, onHeightChange }: CommentFormProps) {
  const [commentText, setCommentText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isMinimized, setIsMinimized] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const formRef = useRef<HTMLDivElement>(null)

  // Load minimized state from localStorage after hydration
  useEffect(() => {
    const savedState = localStorage.getItem('commentFormMinimized')
    if (savedState !== null) {
      setIsMinimized(JSON.parse(savedState))
    }
    setIsHydrated(true)
    
    // Mark as animated after initial load
    const timer = setTimeout(() => {
      setHasAnimated(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Measure and communicate height changes
  useEffect(() => {
    if (formRef.current && onHeightChange) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          onHeightChange(entry.contentRect.height)
        }
      })
      
      resizeObserver.observe(formRef.current)
      
      return () => resizeObserver.disconnect()
    }
  }, [onHeightChange])

  // Save minimized state to localStorage whenever it changes
  const toggleMinimized = () => {
    const newState = !isMinimized
    setIsMinimized(newState)
    localStorage.setItem('commentFormMinimized', JSON.stringify(newState))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!commentText.trim()) {
      return
    }

    // Check authentication when user tries to submit
    if (loading) {
      setError('Please wait while we check your authentication status...')
      return
    }
    
    if (!isAuthenticated || !user?.$id) {
      // Redirect to login if not authenticated
      router.push("/login")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      // Get JWT token for authentication
      const { getCachedJWT } = await import('@/lib/jwtCache')
      const jwt = await getCachedJWT()

      if (!jwt) {
        setError('Authentication token not found. Please sign in again.')
        router.push("/login")
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
          text: commentText.trim(),
          userName: user.name || 'Anonymous'
        })
      })

      if (response.ok) {
        setCommentText("")
        setError("")
        onCommentAdded?.()
      } else if (response.status === 401) {
        // Handle authentication errors
        const errorData = await response.json()
        setError('Authentication failed. Please sign in again.')
        router.push("/login")
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Error posting comment. Please try again.')
      }
    } catch (error) {
      console.error('Error posting comment:', error)
      setError('Error posting comment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div ref={formRef} className={`bg-white px-4 ${isFixed ? (isMinimized ? 'py-2' : 'py-3') : (isMinimized ? 'py-2' : 'py-4')} ${isFixed ? 'fixed bottom-0 z-50 rounded-t-lg shadow-lg' : 'rounded-lg shadow-md'} flex ${isFixed ? '' : 'mb-4'} ${isFixed ? '' : 'relative'} group ${isFixed ? 'max-w-2xl mx-auto left-0 right-0' : ''} transform transition-transform duration-500 ease-out ${!hasAnimated && isHydrated ? 'translate-y-0' : hasAnimated ? '' : 'translate-y-full'}`}>
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className={`flex items-center justify-between ${isMinimized ? 'mb-0' : 'mb-3'}`}>
          <h3 className="font-normal text-gray-900 font-heading text-sm">Comment</h3>
          {isHydrated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMinimized}
              className="h-6 w-6 p-0 hover:bg-gray-100"
              aria-label={isMinimized ? "Expand comment form" : "Minimize comment form"}
            >
              {isMinimized ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        
        {isHydrated && !isMinimized && (
          <>
            <div className="h-px bg-gray-100 mb-4 -mx-4" />
          
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2">
                <Textarea
                  id="comment-text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault()
                      if (commentText.trim() && !isSubmitting) {
                        handleSubmit(e as any)
                      }
                    }
                  }}
                  placeholder="Share your thoughts on this post..."
                  rows={1}
                  required
                  className="text-lg h-12 resize-none"
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Posting..." : "Post Comment"}
              </Button>
            </form>
            
            {!isAuthenticated && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  You need to be signed in to comment.{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

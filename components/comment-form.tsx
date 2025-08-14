"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { ChevronUp, ChevronDown, Reply } from "lucide-react"

interface CommentFormProps {
  postId: string
  onCommentAdded?: () => void
  isFixed?: boolean
  onMinimizedChange?: (isMinimized: boolean) => void
  replyId?: string // Add replyId for nested comments
  replyToComment?: { id: string; author: string; text: string; depth?: number } | null // Add depth for nesting validation
  forceOpen?: boolean // Add prop to force form open (bypasses localStorage)
  onCancelReply?: () => void // Add callback for canceling replies
}

export function CommentForm({ postId, onCommentAdded, isFixed = false, onMinimizedChange, replyId, replyToComment, forceOpen, onCancelReply }: CommentFormProps) {
  const [commentText, setCommentText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isMinimized, setIsMinimized] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [wasMinimized, setWasMinimized] = useState(false)
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const formRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load minimized state from localStorage after hydration (only if not forcing open)
  useEffect(() => {
    if (forceOpen) {
      setIsMinimized(false)
      setWasMinimized(true)
      onMinimizedChange?.(false)
      return
    }

    const savedState = localStorage.getItem('commentFormMinimized')
    if (savedState !== null) {
      const minimized = JSON.parse(savedState)
      setIsMinimized(minimized)
      // Notify parent component about the initial state from localStorage
      onMinimizedChange?.(minimized)
    }
    setIsHydrated(true)
    
    // Mark as animated after initial load
    const timer = setTimeout(() => {
      setHasAnimated(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [onMinimizedChange, forceOpen])

  // Override minimized state when forceOpen prop is provided
  useEffect(() => {
    console.log('forceOpen effect triggered:', forceOpen)
    if (forceOpen) {
      console.log('Setting form to open')
      setIsMinimized(false)
      setWasMinimized(true)
    }
    // Don't reset when forceOpen becomes false - let user control it
  }, [forceOpen])

  // Save minimized state to localStorage whenever it changes
  const toggleMinimized = () => {
    const newState = !isMinimized
    setIsMinimized(newState)
    setWasMinimized(newState)
    
    // If we're minimizing and have a reply, cancel it
    if (newState && replyId && onCancelReply) {
      onCancelReply()
    }
    
    localStorage.setItem('commentFormMinimized', JSON.stringify(newState))
    onMinimizedChange?.(newState)
  }

  // Auto-focus textarea when form is expanded (but not on initial load)
  useEffect(() => {
    if (isHydrated && !isMinimized && wasMinimized && textareaRef.current) {
      // Small delay to ensure the form is fully rendered
      const timer = setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isMinimized, isHydrated, wasMinimized])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!commentText.trim()) {
      return
    }

    // Check if we're trying to reply to a comment at maximum nesting level
    if (replyId && replyToComment && replyToComment.depth === 2) {
      setError('Cannot reply to this comment - maximum nesting level reached.')
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
          userName: user.name || 'Anonymous',
          replyId: replyId || undefined
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
    <div ref={formRef} className={`bg-white px-4 ${isFixed ? 'py-3' : 'py-4'} ${isFixed ? 'fixed bottom-0 z-50 rounded-t-lg shadow-lg' : 'rounded-lg shadow-md'} flex ${isFixed ? '' : 'mb-4'} ${isFixed ? '' : 'relative'} group ${isFixed ? 'max-w-[738px] mx-auto left-0 right-0' : ''} transform transition-transform duration-500 ease-out ${!hasAnimated && isHydrated ? 'translate-y-0' : hasAnimated ? '' : 'translate-y-full'}`}>
      {/* Reply Context Tab - Floating above the entire card */}
      {replyId && replyToComment && (
        <div className="absolute left-6 right-6 top-0 bg-primary/90 text-primary-foreground px-2 py-2 my-4 rounded-t-md -mt-9 animate-in slide-in-from-bottom-2 duration-300 delay-150">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Reply className="w-3 h-3" />
              Replying to {replyToComment.author}
              <span className="text-primary-foreground/70">
                "{replyToComment.text.length > 50 ? replyToComment.text.substring(0, 50) + '...' : replyToComment.text}"
              </span>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="w-5 h-5 flex items-center justify-center transition-colors bg-white rounded-full text-gray-800 hover:bg-gray-100"
            >
              <span className="text-xs font-bold">×</span>
            </button>
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col justify-center min-w-0 relative">
        <div 
          className={`flex items-center justify-between ${isMinimized ? 'mb-0' : 'mb-3'} ${isHydrated ? 'cursor-pointer' : ''}`}
          onClick={isHydrated ? toggleMinimized : undefined}
          role={isHydrated ? "button" : undefined}
          tabIndex={isHydrated ? 0 : undefined}
          onKeyDown={isHydrated ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggleMinimized()
            }
          } : undefined}
          aria-label={isHydrated ? (isMinimized ? "Expand comment form" : "Minimize comment form") : undefined}
        >
          <h3 className="font-normal text-gray-900 font-heading text-sm">
            Comment
          </h3>
          {isHydrated && (
            <div className="h-6 w-6 flex items-center justify-center">
              {isMinimized ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              )}
            </div>
          )}
        </div>
        
        {isHydrated && !isMinimized && (
          <>
            <div className="h-px bg-gray-100 mb-4 -mx-4" />
          
            {error && (
              <div className="mb-4 bg-red-500 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-bold text-white">
                      Error posting comment
                    </h3>
                    <div className="mt-2 text-sm text-white">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                {/* Hidden input for replyId */}
                {replyId && <input type="hidden" name="replyId" value={replyId} />}
                
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
                  placeholder={replyId ? `Reply to ${replyToComment?.author || 'this comment'}...` : "Share your thoughts on this post..."}
                  rows={1}
                  required
                  className="text-lg h-12 resize-none"
                  ref={textareaRef}
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (replyId ? "Posting Reply..." : "Posting...") : (replyId ? "Post Reply" : "Post Comment")}
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

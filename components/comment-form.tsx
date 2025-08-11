"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

interface CommentFormProps {
  postId: string
  onCommentAdded?: () => void
}

export function CommentForm({ postId, onCommentAdded }: CommentFormProps) {
  const [commentText, setCommentText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()

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

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          postId,
          text: commentText.trim()
        })
      })

      if (response.ok) {
        setCommentText("")
        setError("")
        onCommentAdded?.()
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
    <div className="bg-white px-4 py-4 rounded-lg flex mb-4 relative group">
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <h3 className="font-normal text-gray-900 mb-3 font-heading text-sm">Add a Comment</h3>
        <div className="h-px bg-gray-100 mb-4 -mx-4" />
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="comment-text" className="text-sm">Comment *</Label>
            <Textarea
              id="comment-text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts on this post..."
              rows={4}
              required
              className="text-sm"
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
      </div>
    </div>
  )
}

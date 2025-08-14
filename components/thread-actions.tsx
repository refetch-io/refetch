"use client"

import { Copy, Flag, Trash2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { deletePost } from "@/lib/postHandler"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface ThreadActionsProps {
  postId: string
}

export function ThreadActions({ postId }: ThreadActionsProps) {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [postUserId, setPostUserId] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(true)

  // Fetch post data to get the userId
  useEffect(() => {
    const fetchPostData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/posts/${postId}`)
        if (response.ok) {
          const data = await response.json()
          setPostUserId(data.post.userId)
        }
      } catch (error) {
        console.error('Error fetching post data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (postId) {
      fetchPostData()
    }
  }, [postId])

  // Check if current user is the owner of this post
  const isOwner = isAuthenticated && user && postUserId && user.$id === postUserId

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    // You could add a toast notification here instead of the current approach
  }

  const handleDeletePost = async () => {
    if (!isOwner) return

    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      const result = await deletePost(postId)
      if (result.success) {
        // Redirect to home page after successful deletion
        router.push('/')
      } else {
        alert(`Failed to delete post: ${result.error}`)
      }
    }
  }

  return (
    <div className="bg-white rounded-lg">
      <h3 className="font-normal text-gray-900 mb-2 px-4 pt-2 font-heading text-sm">Actions</h3>
      {/* Separator between title and first item */}
      <div className="h-px bg-gray-100" />
      <div className="space-y-0">
        <div>
          <button 
            onClick={handleCopyLink}
            className="w-full text-left text-xs text-gray-700 hover:text-blue-600 hover:bg-gray-50 py-2 px-4 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Copy className="h-4 w-4" />
            Copy Link
          </button>
        </div>
        <div className="h-px bg-gray-100" />
        <div>
          <button className="w-full text-left text-xs text-gray-700 hover:text-red-600 hover:bg-gray-50 py-2 px-4 transition-colors flex items-center gap-2 cursor-pointer">
            <Flag className="h-4 w-4" />
            Report
          </button>
        </div>
        {/* Delete button - only show for post owners with smooth transition */}
        {!isLoading && isOwner && (
          <>
            <div className="h-px bg-gray-100" />
            <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <button 
                onClick={handleDeletePost}
                className="w-full text-left text-xs hover:text-red-700 py-2 px-4 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { ClientPage } from "../client-page"
import { type NewsItem } from "@/lib/data"
import { getCachedJWT } from "@/lib/jwtCache"

export function MinesClientWrapper() {
  const [posts, setPosts] = useState<NewsItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Check authentication when component mounts
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
      return
    }

    if (isAuthenticated && user?.$id) {
      fetchUserSubmissions()
    }
  }, [isAuthenticated, authLoading, user, router])

  const fetchUserSubmissions = async () => {
    try {
      setError(null)

      // Get JWT token using the cached JWT function
      const jwt = await getCachedJWT()
      
      const response = await fetch('/api/user-submissions', {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch submissions')
      }

      const data = await response.json()
      setPosts(data.posts)
    } catch (error) {
      console.error('Error fetching user submissions:', error)
      setError('Error fetching submissions. Please try again.')
    }
  }

  if (authLoading) {
    // Show empty state while checking authentication
    return <ClientPage initialPosts={[]} error={undefined} />
  }

  if (!isAuthenticated) {
    // Show authentication required message
    return <ClientPage initialPosts={[]} error="Please log in to view your posts" />
  }

  // Use the same ClientPage component as other pages for consistent layout
  return <ClientPage initialPosts={posts} error={error || undefined} />
}

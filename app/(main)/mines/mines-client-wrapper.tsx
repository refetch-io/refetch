"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { ClientPage } from "../client-page"
import { type NewsItem } from "@/lib/data"
import { fetchUserSubmissionsFromAppwriteWithVotes } from "@/lib/data"

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

      // Use the new function that fetches posts with vote information
      const result = await fetchUserSubmissionsFromAppwriteWithVotes(user!.$id)
      
      if (result.error) {
        setError(result.error)
      } else {
        setPosts(result.posts)
      }
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

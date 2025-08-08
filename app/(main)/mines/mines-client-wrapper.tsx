"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { ClientPage } from "../client-page"
import { type NewsItem } from "@/lib/data"

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

      // Get JWT token for authentication
      const { getCachedJWT } = await import('@/lib/jwtCache')
      const jwt = await getCachedJWT()

      const response = await fetch('/api/user-submissions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Convert the Appwrite posts to NewsItem format
        const convertedPosts = data.posts.map((post: any, index: number) => ({
          id: post.$id,
          title: post.title,
          domain: post.link ? new URL(post.link).hostname : "appwrite.io",
          daysAgo: getTimeAgo(post.$createdAt),
          score: post.countUp - post.countDown,
          iconName: "User", // Use User icon for submissions
          bgColorClass: "bg-blue-500",
          shapeClass: "rounded-full",
          extendedHighlight: post.description,
          comments: [],
          author: post.userName,
          isSponsored: false,
          link: post.link,
          type: post.type,
        }))
        setPosts(convertedPosts)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to fetch submissions')
      }
    } catch (error) {
      console.error('Error fetching user submissions:', error)
      setError('Error fetching submissions. Please try again.')
    }
  }

  const getTimeAgo = (createdAt: string): string => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - created.getTime())
    
    const seconds = Math.floor(diffTime / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (seconds < 60) {
      return seconds === 1 ? "1 second ago" : `${seconds} seconds ago`
    } else if (minutes < 60) {
      return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`
    } else if (hours < 24) {
      return hours === 1 ? "1 hour ago" : `${hours} hours ago`
    } else {
      return days === 1 ? "1 day ago" : `${days} days ago`
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

import { fetchPostById } from "@/lib/data"
import { ThreadClientPage } from "./thread-client-page"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

// Disable cache completely - fetch fresh data on every request
export const revalidate = 0

interface ThreadPageProps {
  params: Promise<{ id: string }>
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  try {
    const unwrappedParams = await params
    // Note: fetchPostById already fetches comments in a single call
    // For individual posts, this is already optimized
    const article = await fetchPostById(unwrappedParams.id)
    
    if (!article) {
      notFound()
    }
    
    return <ThreadClientPage article={article} />
  } catch (error) {
    console.error('Error loading article:', error)
    throw error
  }
} 
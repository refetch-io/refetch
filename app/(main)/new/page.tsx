import { fetchPostsFromAppwriteWithSortAndVotes } from "@/lib/data"
import { ClientPage } from "../client-page"
import type { Metadata } from "next"

// Disable cache completely - fetch fresh data on every request
export const revalidate = 0

export const metadata: Metadata = {
  title: "New - Refetch",
  description: "Latest technology news and discussions sorted by newest first.",
  openGraph: {
    title: "New - Refetch",
    description: "Latest technology news and discussions sorted by newest first.",
  },
}

export default async function NewPage() {
  // Fetch posts from Appwrite on the server (sorted by creation date)
  const result = await fetchPostsFromAppwriteWithSortAndVotes('new')
  
  // Add timestamp for debugging
  console.log(`New page rendered at ${new Date().toISOString()} with ${result.posts.length} posts`)
  
  return <ClientPage initialPosts={result.posts} error={result.error} sortType="new" />
} 
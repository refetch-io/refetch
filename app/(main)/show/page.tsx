import { fetchPostsFromAppwriteWithSortAndVotes } from "@/lib/data"
import { ClientPage } from "../client-page"
import type { Metadata } from "next"

// Disable cache completely - fetch fresh data on every request
export const revalidate = 0

export const metadata: Metadata = {
  title: "Show - Refetch",
  description: "Show and tell posts from the Refetch community.",
  openGraph: {
    title: "Show - Refetch",
    description: "Show and tell posts from the Refetch community.",
  },
}

export default async function ShowPage() {
  // Fetch posts from Appwrite on the server (filtered by type=show and sorted by score)
  const result = await fetchPostsFromAppwriteWithSortAndVotes('show')
  
  // Add timestamp for debugging
  console.log(`Show page rendered at ${new Date().toISOString()} with ${result.posts.length} show posts`)
  
  return <ClientPage initialPosts={result.posts} error={result.error} sortType="show" />
} 
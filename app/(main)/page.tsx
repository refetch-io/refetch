import { fetchPostsFromAppwriteWithCommentsAndVotes } from "@/lib/data"
import { ClientPage } from "./client-page"
import type { Metadata } from "next"

// Disable cache completely - fetch fresh data on every request
export const revalidate = 0

export const metadata: Metadata = {
  title: "Refetch - Latest Tech News & Discussions",
  description: "Discover the latest technology news, startup updates, and programming discussions on Refetch. An open-source community-driven platform for tech enthusiasts.",
  openGraph: {
    title: "Refetch - Latest Tech News & Discussions",
    description: "Discover the latest technology news, startup updates, and programming discussions on Refetch. An open-source community-driven platform for tech enthusiasts.",
  },
}

export default async function RefetchHomePage() {
  // Fetch posts from Appwrite on the server with comments and votes in batch
  // This is much more efficient than individual API calls
  const result = await fetchPostsFromAppwriteWithCommentsAndVotes()
  
  // Add timestamp for debugging
  console.log(`Page rendered at ${new Date().toISOString()} with ${result.posts.length} posts`)
  
  return <ClientPage initialPosts={result.posts} error={result.error} sortType="score" />
}

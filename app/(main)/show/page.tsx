import { fetchPostsFromAppwriteWithSort } from "@/lib/data"
import { ClientPage } from "../client-page"
import type { Metadata } from "next"

// Disable cache completely - fetch fresh data on every request
export const revalidate = 0

export const metadata: Metadata = {
  title: "Show HN - Refetch",
  description: "Browse Show RF posts on Refetch - discover new projects, tools, and creations from the tech community. Share your work and get feedback from fellow developers.",
  openGraph: {
    title: "Show RF - Refetch",
    description: "Browse Show HN posts on Refetch - discover new projects, tools, and creations from the tech community. Share your work and get feedback from fellow developers.",
  },
}

export default async function ShowPage() {
  // Fetch posts from Appwrite on the server (filtered by type=show and sorted by score)
  const result = await fetchPostsFromAppwriteWithSort('show')
  
  // Add timestamp for debugging
  console.log(`Show page rendered at ${new Date().toISOString()} with ${result.posts.length} show posts`)
  
  return <ClientPage initialPosts={result.posts} error={result.error} />
} 
import { fetchPostsFromAppwriteWithSort } from "@/lib/data"
import { ClientPage } from "../client-page"

// Disable cache completely - fetch fresh data on every request
export const revalidate = 0

export default async function ShowPage() {
  // Fetch posts from Appwrite on the server (filtered by type=show and sorted by score)
  const result = await fetchPostsFromAppwriteWithSort('show')
  
  // Add timestamp for debugging
  console.log(`Show page rendered at ${new Date().toISOString()} with ${result.posts.length} show posts`)
  
  return <ClientPage initialPosts={result.posts} error={result.error} />
} 
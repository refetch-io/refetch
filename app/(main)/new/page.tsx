import { fetchPostsFromAppwriteWithSort } from "@/lib/data"
import { ClientPage } from "../client-page"

// Disable cache completely - fetch fresh data on every request
export const revalidate = 0

export default async function NewPage() {
  // Fetch posts from Appwrite on the server (sorted by creation date)
  const result = await fetchPostsFromAppwriteWithSort('new')
  
  // Add timestamp for debugging
  console.log(`New page rendered at ${new Date().toISOString()} with ${result.posts.length} posts`)
  
  return <ClientPage initialPosts={result.posts} error={result.error} />
} 
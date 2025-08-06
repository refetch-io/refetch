import { fetchPostsFromAppwrite } from "@/lib/data"
import { ClientPage } from "./client-page"

// Disable cache completely - fetch fresh data on every request
export const revalidate = 0

export default async function RefetchHomePage() {
  // Fetch posts from Appwrite on the server (already sorted by score)
  const result = await fetchPostsFromAppwrite()
  
  // Add timestamp for debugging
  console.log(`Page rendered at ${new Date().toISOString()} with ${result.posts.length} posts`)
  
  return <ClientPage initialPosts={result.posts} error={result.error} />
}

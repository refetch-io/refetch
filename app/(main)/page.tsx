import { fetchPostsFromAppwrite } from "@/lib/data"
import { ClientPage } from "./client-page"

// Disable cache completely - fetch fresh data on every request
export const revalidate = 0

export default async function RefetchHomePage() {
  // Fetch posts from Appwrite on the server
  const posts = await fetchPostsFromAppwrite()
  
  // Add timestamp for debugging
  console.log(`Page rendered at ${new Date().toISOString()} with ${posts.length} posts`)
  
  return <ClientPage initialPosts={posts} />
}

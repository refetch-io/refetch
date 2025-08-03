import { fetchPostsFromAppwrite, allNewsItems } from "@/lib/data"
import { ClientPage } from "./client-page"

// Force revalidation every 30 seconds
export const revalidate = 30

export default async function RefetchHomePage() {
  // Fetch posts from Appwrite on the server
  const posts = await fetchPostsFromAppwrite()
  
  // If no posts found from Appwrite, use dummy data
  const finalPosts = posts.length > 0 ? posts : allNewsItems.slice(0, 50)
  
  // Add timestamp for debugging
  console.log(`Page rendered at ${new Date().toISOString()} with ${finalPosts.length} posts`)
  
  return <ClientPage initialPosts={finalPosts} />
}

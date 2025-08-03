import { fetchPostsFromAppwrite, allNewsItems } from "@/lib/data"
import { ClientPage } from "./client-page"

export default async function RefetchHomePage() {
  // Fetch posts from Appwrite on the server
  const posts = await fetchPostsFromAppwrite()
  
  // If no posts found from Appwrite, use dummy data
  const finalPosts = posts.length > 0 ? posts : allNewsItems.slice(0, 50)
  
  return <ClientPage initialPosts={finalPosts} />
}

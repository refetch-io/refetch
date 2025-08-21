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
    type: "website",
    url: "https://refetch.io/new",
    images: [
      {
        url: "https://refetch.io/og.png",
        width: 1200,
        height: 630,
        alt: "New - Refetch",
      },
    ],
    siteName: "Refetch",
  },
  twitter: {
    card: "summary_large_image",
    title: "New - Refetch",
    description: "Latest technology news and discussions sorted by newest first.",
    images: ["https://refetch.io/og.png"],
  },
}

export default async function NewPage() {
  // Fetch posts from Appwrite on the server (sorted by creation date)
  const result = await fetchPostsFromAppwriteWithSortAndVotes('new')
  
  return <ClientPage initialPosts={result.posts} error={result.error} sortType="new" />
} 
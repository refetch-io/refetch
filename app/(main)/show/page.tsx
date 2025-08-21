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
    type: "website",
    url: "https://refetch.io/show",
    images: [
      {
        url: "https://refetch.io/og.png",
        width: 1200,
        height: 630,
        alt: "Show - Refetch",
      },
    ],
    siteName: "Refetch",
  },
  twitter: {
    card: "summary_large_image",
    title: "Show - Refetch",
    description: "Show and tell posts from the Refetch community.",
    images: ["https://refetch.io/og.png"],
  },
}

export default async function ShowPage() {
  // Fetch posts from Appwrite on the server (filtered by type=show and sorted by score)
  const result = await fetchPostsFromAppwriteWithSortAndVotes('show')
  
  return <ClientPage initialPosts={result.posts} error={result.error} sortType="show" />
} 
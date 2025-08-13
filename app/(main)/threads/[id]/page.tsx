import { fetchPostById } from "@/lib/data"
import { ThreadClientPage } from "./thread-client-page"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

// Disable cache completely - fetch fresh data on every request
export const revalidate = 0

interface ThreadPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ThreadPageProps): Promise<Metadata> {
  try {
    const unwrappedParams = await params
    const article = await fetchPostById(unwrappedParams.id)
    
    if (!article) {
      return {
        title: 'Thread Not Found',
        description: 'The requested thread could not be found.',
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://refetch.io'
    
    return {
      title: `${article.title} | Refetch`,
      description: article.description || `Discussion about ${article.title}`,
      openGraph: {
        title: article.title,
        description: article.description || `Discussion about ${article.title}`,
        type: 'article',
        url: `${baseUrl}/threads/${article.id}`,
        images: [
          {
            url: `${baseUrl}/api/og/thread/${article.id}`,
            width: 2400,
            height: 1260,
            alt: article.title,
          },
        ],
        siteName: 'Refetch',
      },
      twitter: {
        card: 'summary_large_image',
        title: article.title,
        description: article.description || `Discussion about ${article.title}`,
        images: [`${baseUrl}/api/og/thread/${article.id}`],
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Thread | Refetch',
      description: 'Tech news and discussions on Refetch.',
    }
  }
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  try {
    const unwrappedParams = await params
    // Note: fetchPostById already fetches comments in a single call
    // For individual posts, this is already optimized
    const article = await fetchPostById(unwrappedParams.id)
    
    if (!article) {
      notFound()
    }
    
    return <ThreadClientPage article={article} />
  } catch (error) {
    console.error('Error loading article:', error)
    throw error
  }
} 
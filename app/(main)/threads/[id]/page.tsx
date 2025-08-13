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
        title: 'Thread Not Found | Refetch',
        description: 'The requested thread could not be found.',
        robots: 'noindex, nofollow',
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://refetch.io'
    const canonicalUrl = `${baseUrl}/threads/${article.id}`
    
    // Enhanced metadata for better SEO
    return {
      title: `${article.title} | Refetch`,
      description: article.description || `Discussion about ${article.title}. Join the conversation on Refetch, the open-source alternative to YC-controlled HN.`,
      keywords: [
        'tech news',
        'discussion',
        'community',
        'open source',
        'hacker news alternative',
        'refetch',
        article.domain,
        ...(article.description ? article.description.split(' ').slice(0, 10) : [])
      ].filter(Boolean),
      authors: article.author ? [{ name: article.author }] : undefined,
      creator: 'Refetch',
      publisher: 'Refetch',
      formatDetection: {
        email: false,
        address: false,
        telephone: false,
      },
      metadataBase: new URL(baseUrl),
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: article.title,
        description: article.description || `Discussion about ${article.title}. Join the conversation on Refetch.`,
        type: 'article',
        url: canonicalUrl,
        siteName: 'Refetch',
        locale: 'en_US',
        images: [
          {
            url: `${baseUrl}/api/og/thread/${article.id}`,
            width: 2400,
            height: 1260,
            alt: article.title,
            type: 'image/png',
            secureUrl: `${baseUrl}/api/og/thread/${article.id}`,
          },
        ],
        authors: article.author ? [article.author] : undefined,
        publishedTime: undefined, // NewsItem doesn't have $createdAt
        modifiedTime: undefined, // NewsItem doesn't have $updatedAt
        section: 'Technology',
        tags: [article.domain, 'tech news', 'discussion'],
      },
      twitter: {
        card: 'summary_large_image',
        title: article.title,
        description: article.description || `Discussion about ${article.title}. Join the conversation on Refetch.`,
        images: [
          {
            url: `${baseUrl}/api/og/thread/${article.id}`,
            alt: article.title,
            width: 2400,
            height: 1260,
            type: 'image/png',
          }
        ],
        creator: '@refetch_io',
        site: '@refetch_io',
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      verification: {
        google: process.env.GOOGLE_SITE_VERIFICATION,
        yandex: process.env.YANDEX_VERIFICATION,
        yahoo: process.env.YAHOO_VERIFICATION,
      },
      other: {
        'article:author': article.author,
        'article:section': 'Technology',
        'article:tag': [article.domain, 'tech news', 'discussion'],
        'og:image:width': '2400',
        'og:image:height': '1260',
        'og:image:type': 'image/png',
        'og:image:secure_url': `${baseUrl}/api/og/thread/${article.id}`,
        'twitter:image:width': '2400',
        'twitter:image:height': '1260',
        // LinkedIn specific optimizations
        'og:image:alt': article.title,
        'og:image:url': `${baseUrl}/api/og/thread/${article.id}`,
        // Cache busting for social platforms
        'og:image:updated_time': new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Thread | Refetch',
      description: 'Tech news and discussions on Refetch, the open-source alternative to YC-controlled HN.',
      robots: 'noindex, nofollow',
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
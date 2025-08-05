import Link from "next/link"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CommentsSection } from "@/components/comments-section"
import { fetchPostById } from "@/lib/data"
import { handleVote } from "@/lib/voteHandler"
import { Favicon } from "@/components/favicon"
import { ThreadClientPage } from "./thread-client-page"

interface ThreadPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const unwrappedParams = await params
  const article = await fetchPostById(unwrappedParams.id)

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Thread Not Found</h1>
        <p className="text-gray-600 mb-6">The thread you are looking for does not exist.</p>
        <Link href="/" passHref>
          <Button className="bg-[#4e1cb3] hover:bg-[#5d2bc4]">
            Back to Home
          </Button>
        </Link>
      </div>
    )
  }

  return <ThreadClientPage article={article} />
} 
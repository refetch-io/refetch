import { Link, createFileRoute } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { staticFeedPosts } from "@/data/feed-posts"

export const Route = createFileRoute("/_dashboard/threads/$threadId")({
  staticData: { title: "Thread" },
  component: ThreadDetailPage,
})

function ThreadDetailPage() {
  const { threadId } = Route.useParams()
  const post = staticFeedPosts.find((p) => p.id === threadId)

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Thread not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/threads">Back to feed</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 md:p-6">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link to="/threads">← Back to feed</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl leading-snug">{post.title}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {post.author} · {post.submittedAt} · {post.commentCount} comments
          </p>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          <p>
            Discussion view is a placeholder. Wire this route to Appwrite comments
            when you connect live data.
          </p>
          {post.url ? (
            <p className="mt-3">
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Open original article
              </a>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

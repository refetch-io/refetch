import { createFileRoute } from "@tanstack/react-router"

import { FeedList } from "@/components/feed/feed-list"

export const Route = createFileRoute("/_dashboard/threads")({
  staticData: { title: "Threads" },
  component: ThreadsPage,
})

function ThreadsPage() {
  return <FeedList defaultSort="top" showHeader={false} />
}

import { createFileRoute } from "@tanstack/react-router"

import { FeedList } from "@/components/feed/feed-list"

export const Route = createFileRoute("/_dashboard/feed")({
  staticData: { title: "Feed" },
  component: HomeFeedPage,
})

function HomeFeedPage() {
  return <FeedList defaultSort="top" />
}

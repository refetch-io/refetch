import { createFileRoute } from "@tanstack/react-router"

import { FeedPage } from "@/components/feed/page/feed-page"

export const Route = createFileRoute("/feed")({
  component: FeedPage,
})

import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_dashboard/topics")({
  staticData: { title: "Topics" },
  component: TopicsPage,
})

function TopicsPage() {
  return (
    <div className="flex flex-1 flex-col gap-2 p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Topics</h1>
      <p className="text-muted-foreground text-sm">Topic browser coming soon.</p>
    </div>
  )
}

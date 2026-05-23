import { useMemo, useState } from "react"
import { Sparkles } from "lucide-react"

import { FeedPostCard } from "@/components/feed/feed-post-card"
import { FeedVariantPicker } from "@/components/feed/feed-variant-picker"
import {
  FeedVariantProvider,
  useFeedVariant,
} from "@/components/feed/feed-variant-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { staticFeedPosts } from "@/data/feed-posts"
import { sortFeedPosts } from "@/lib/feed/sort-posts"
import type { FeedSort } from "@/lib/feed/types"
import { cn } from "@/lib/utils"

type FeedListProps = {
  defaultSort?: FeedSort
  showHeader?: boolean
}

function FeedListInner({ defaultSort = "top", showHeader = true }: FeedListProps) {
  const { variant } = useFeedVariant()
  const [sort, setSort] = useState<FeedSort>(defaultSort)

  const posts = useMemo(() => sortFeedPosts(staticFeedPosts, sort), [sort])

  const listGap =
    variant === "minimal" ? "gap-0" : variant === "timeline" ? "gap-2" : "gap-2"

  return (
    <div className="feed-surface mx-auto w-full max-w-2xl px-4 py-5 md:px-6 md:py-8">
      {showHeader ? (
        <header className="mb-6 space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary size-4" />
            <CardTitle className="text-lg font-semibold tracking-tight">Front page</CardTitle>
          </div>
          <CardDescription className="text-sm">
            Tech links ranked by the community — preview data
          </CardDescription>
        </header>
      ) : null}

      <Card size="sm" className="feed-panel gap-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="border-border/80 flex flex-col gap-3 border-b bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={sort} onValueChange={(value) => setSort(value as FeedSort)}>
            <TabsList className="bg-background/80 h-8">
              <TabsTrigger value="top" className="px-3 text-xs">
                Top
              </TabsTrigger>
              <TabsTrigger value="new" className="px-3 text-xs">
                New
              </TabsTrigger>
              <TabsTrigger value="show" className="px-3 text-xs">
                Show
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <FeedVariantPicker />
        </CardHeader>

        <CardContent className="p-0">
          {posts.length === 0 ? (
            <p className="text-muted-foreground py-16 text-center text-sm">
              No posts in this view yet.
            </p>
          ) : (
            <ul className={cn("flex flex-col p-2 sm:p-3", listGap)}>
              {posts.map((post) => (
                <li key={post.id}>
                  <FeedPostCard post={post} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function FeedList(props: FeedListProps) {
  return (
    <FeedVariantProvider>
      <FeedListInner {...props} />
    </FeedVariantProvider>
  )
}

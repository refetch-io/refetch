import { ChevronDown } from "lucide-react"

import { FeedComposer } from "@/components/feed/page/feed-composer"
import { FeedLeftColumn } from "@/components/feed/page/feed-left-sidebar"
import { FeedPageTabs, FeedPageTitle } from "@/components/feed/page/feed-page-header"
import { FeedPostCard } from "@/components/feed/page/feed-post-card"
import { FeedRightSidebar } from "@/components/feed/page/feed-right-sidebar"
import { LandingFooter } from "@/components/landing/landing-footer"
import { feedPagePosts } from "@/data/feed-page-posts"

export function FeedPage() {
  return (
    <div className="landing-root min-h-screen">
      <div className="mx-auto w-full max-w-page">
        <div
          className={[
            "grid grid-cols-1 items-start gap-x-6 gap-y-6 px-4 pb-10 md:px-6",
            "lg:grid-cols-[220px_minmax(0,1fr)] lg:grid-rows-[auto_auto_minmax(0,1fr)] lg:gap-y-0",
            "xl:grid-cols-[220px_minmax(0,1fr)_280px]",
          ].join(" ")}
        >
          <FeedLeftColumn />

          <FeedPageTitle className="min-w-0 lg:col-start-2 lg:row-start-1 xl:col-span-2" />

          <FeedPageTabs className="min-w-0 lg:col-start-2 lg:row-start-2 xl:col-span-2" />

          <main className="min-w-0 lg:col-start-2 lg:row-start-3 lg:pt-6 xl:col-start-2">
            <FeedComposer />
            <ul>
              {feedPagePosts.map((post) => (
                <li key={post.id}>
                  <FeedPostCard post={post} />
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground mt-2 flex w-full cursor-pointer items-center justify-center gap-1 rounded-xl border border-border bg-muted/50 py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Load more posts
              <ChevronDown className="size-4" />
            </button>
          </main>

          <FeedRightSidebar className="lg:col-start-2 lg:row-start-3 lg:pt-6 xl:col-start-3 xl:row-start-3" />
        </div>

        <LandingFooter />
      </div>
    </div>
  )
}

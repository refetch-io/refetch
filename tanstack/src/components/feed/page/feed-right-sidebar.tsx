import { ArrowRight } from "lucide-react"

import { FeedPanel } from "@/components/feed/page/feed-panel"
import { Button } from "@/components/ui/button"
import { RefetchAvatar } from "@/components/ui/refetch-avatar"
import { cn } from "@/lib/utils"

const TRENDING = [
  { rank: 1, title: "GPT-5 launch imminent", meta: "42.1k posts" },
  { rank: 2, title: "Best programming languages 2026", meta: "18.4k posts" },
  { rank: 3, title: "Refetch Pro announcement", meta: "12.7k posts" },
  { rank: 4, title: "AI regulation debate", meta: "9.2k posts" },
  { rank: 5, title: "Remote work is here to stay", meta: "7.8k posts" },
] as const

const SUGGESTIONS = [
  { name: "Sarah Chen", handle: "@sarahcodes" },
  { name: "DevBot", handle: "@devbot_ai" },
  { name: "Tech Insider", handle: "@tech_insider" },
] as const

export function FeedRightSidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "hidden w-[280px] shrink-0 xl:sticky xl:top-6 xl:z-10 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:overscroll-contain xl:self-start xl:block",
        className,
      )}
    >
      <FeedPanel className="mb-4 p-4">
        <h3 className="text-foreground mb-3 text-sm font-semibold">Trending now</h3>
        <ol className="space-y-2">
          {TRENDING.map((item) => (
            <li key={item.rank}>
              <a
                href="#"
                className="group flex items-start gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-muted/80"
              >
                <span className="text-muted-foreground w-4 shrink-0 font-mono text-xs tabular-nums">
                  {item.rank}
                </span>
                <span className="min-w-0">
                  <p className="text-foreground group-hover:text-foreground/90 text-sm leading-snug font-medium">
                    {item.title}
                  </p>
                  <p className="text-muted-foreground text-[11px]">{item.meta}</p>
                </span>
              </a>
            </li>
          ))}
        </ol>
        <a
          href="#"
          className="text-[var(--brand)] hover:text-[var(--brand)]/80 mt-3 inline-flex items-center gap-1 text-xs font-medium"
        >
          View all trends
          <ArrowRight className="size-3" />
        </a>
      </FeedPanel>

      <FeedPanel className="p-4">
        <h3 className="text-foreground mb-3 text-sm font-semibold">Who to follow</h3>
        <ul className="space-y-3">
          {SUGGESTIONS.map((user) => (
            <li key={user.handle} className="flex items-center gap-2.5">
              <RefetchAvatar seed={user.handle} className="size-9" fallbackClassName="text-xs" />
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">{user.name}</p>
                <p className="text-muted-foreground truncate text-xs">{user.handle}</p>
              </div>
              <Button variant="brand" size="pill-sm" className="h-8 shrink-0 px-3 text-xs">
                Follow
              </Button>
            </li>
          ))}
        </ul>
        <a
          href="#"
          className="text-[var(--brand)] hover:text-[var(--brand)]/80 mt-3 inline-flex items-center gap-1 text-xs font-medium"
        >
          View all suggestions
          <ArrowRight className="size-3" />
        </a>
      </FeedPanel>
    </aside>
  )
}

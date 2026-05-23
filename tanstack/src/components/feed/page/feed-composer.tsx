import {
  BarChart3,
  FileText,
  HelpCircle,
  MessageSquare,
  Plus,
  Sparkles,
} from "lucide-react"

import { FeedPanel } from "@/components/feed/page/feed-panel"
import { Button } from "@/components/ui/button"
import { RefetchAvatar } from "@/components/ui/refetch-avatar"

const COMPOSER_ACTIONS = [
  { label: "Article", icon: FileText },
  { label: "Discussion", icon: MessageSquare },
  { label: "Showcase", icon: Sparkles },
  { label: "Ask", icon: HelpCircle },
  { label: "Poll", icon: BarChart3 },
] as const

export function FeedComposer() {
  return (
    <FeedPanel className="mb-4 p-4">
      <div className="flex gap-3">
        <RefetchAvatar
          seed="You"
          className="size-9 shrink-0 after:hidden"
          fallbackClassName="text-xs"
        />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="text-muted-foreground hover:text-muted-foreground/90 w-full rounded-xl border border-input bg-muted/40 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted"
          >
            What&apos;s on your mind?
          </button>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-1">
              {COMPOSER_ACTIONS.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <Button variant="brand" size="pill-sm" className="shrink-0 gap-1">
              <Plus className="size-3.5" />
              Create Post
            </Button>
          </div>
        </div>
      </div>
    </FeedPanel>
  )
}

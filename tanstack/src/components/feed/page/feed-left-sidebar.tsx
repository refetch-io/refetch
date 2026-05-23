import {
  Briefcase,
  FileText,
  HelpCircle,
  LayoutGrid,
  MessageSquare,
  Sparkles,
} from "lucide-react"

import { feedPageTopPadding } from "@/components/feed/page/feed-page-header"
import { SiteLogo } from "@/components/site/site-logo"
import { CommunityAvatarBadge } from "@/components/ui/refetch-avatar"
import { cn } from "@/lib/utils"

const EXPLORE = [
  { label: "All Posts", icon: LayoutGrid, active: true },
  { label: "Articles", icon: FileText },
  { label: "Discussions", icon: MessageSquare },
  { label: "Showcases", icon: Sparkles },
  { label: "Ask", icon: HelpCircle },
  { label: "Jobs", icon: Briefcase },
] as const

const COMMUNITIES = [
  "r/ChatGPT",
  "r/TechNews",
  "r/ArtificialIntelligence",
  "r/ProgrammerHumor",
  "r/NextJS",
] as const

const TOPICS = [
  "AI & Machine Learning",
  "Web Development",
  "DevOps",
  "Startups",
  "Tech News",
  "Career",
  "Design",
  "Cloud",
] as const

function SectionHeading({ children }: { children: string }) {
  return (
    <p className="text-muted-foreground/70 mb-2 text-[10px] font-semibold tracking-widest uppercase">
      {children}
    </p>
  )
}

type FeedPageLogoProps = {
  className?: string
}

export function FeedPageLogo({ className }: FeedPageLogoProps) {
  return (
    <a
      href="/about"
      className={cn(
        "mt-2 hidden shrink-0 px-2 leading-none lg:block",
        feedPageTopPadding,
        className,
      )}
    >
      <SiteLogo heightClass="h-[26.4px]" />
    </a>
  )
}

type FeedLeftNavProps = {
  className?: string
}

export function FeedLeftNav({ className }: FeedLeftNavProps) {
  return (
    <nav
      className={cn(
        "hidden min-h-0 flex-col pb-2 lg:flex",
        className,
      )}
    >
      <section className="pt-6 pb-4 lg:pt-12">
        <SectionHeading>Explore</SectionHeading>
        <ul className="space-y-0.5">
          {EXPLORE.map((item) => {
            const { label, icon: Icon } = item
            const active = "active" in item && item.active

            return (
              <li key={label}>
                <a
                  href="#"
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand text-brand-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={2} />
                  {label}
                </a>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="border-t border-border py-4">
        <SectionHeading>My Communities</SectionHeading>
        <ul className="space-y-0.5">
          {COMMUNITIES.map((name) => (
            <li key={name}>
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <CommunityAvatarBadge seed={name} className="size-5 text-[9px]" />
                <span className="truncate">{name}</span>
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#"
          className="text-[var(--brand)] hover:text-[var(--brand)]/80 mt-2 inline-block px-2 text-xs font-medium"
        >
          View All
        </a>
      </section>

      <section className="border-t border-border pt-4">
        <SectionHeading>Topics</SectionHeading>
        <ul className="space-y-0">
          {TOPICS.map((topic) => (
            <li key={topic}>
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground block rounded-lg px-2 py-1 text-sm transition-colors hover:bg-muted"
              >
                {topic}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </nav>
  )
}

type FeedLeftColumnProps = {
  className?: string
}

/** Sticky left rail: logo + scrollable nav stay pinned while the feed scrolls. */
export function FeedLeftColumn({ className }: FeedLeftColumnProps) {
  return (
    <aside
      className={cn(
        "hidden lg:col-start-1 lg:row-start-1 lg:row-span-3 lg:block lg:w-[220px] lg:self-start",
        className,
      )}
    >
      <div className="sticky top-6 z-10 flex max-h-[calc(100vh-3rem)] flex-col">
        <FeedPageLogo />
        <FeedLeftNav className="min-h-0 flex-1 overflow-y-auto overscroll-contain" />
      </div>
    </aside>
  )
}

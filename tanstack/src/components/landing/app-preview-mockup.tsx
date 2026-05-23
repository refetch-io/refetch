import {
  ChevronRight,
  Compass,
  Hash,
  Home,
  MessageSquare,
  Plus,
  Search,
  Share2,
  TrendingUp,
} from "lucide-react"

import { RefetchLogo } from "@/components/landing/refetch-logo"

function SidebarItem({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ElementType
  label: string
  active?: boolean
}) {
  return (
    <li
      className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[11px] ${
        active ? "bg-muted text-foreground" : "text-muted-foreground"
      }`}
    >
      <Icon className="size-3.5" />
      <span className="truncate">{label}</span>
    </li>
  )
}

function CommunityRow({ letter, name, color }: { letter: string; name: string; color: string }) {
  return (
    <li className="text-muted-foreground flex items-center gap-2 px-2 py-1 text-[11px]">
      <span
        className={`flex size-4 items-center justify-center rounded-full text-[8px] font-bold text-white ${color}`}
      >
        {letter}
      </span>
      <span className="truncate">{name}</span>
    </li>
  )
}

function TrendingItem({
  rank,
  title,
  subtitle,
}: {
  rank: number
  title: string
  subtitle: string
}) {
  return (
    <li className="flex items-start gap-2.5 px-2 py-1.5 text-[11px]">
      <span className="text-muted-foreground/70 w-3 shrink-0 font-mono">{rank}</span>
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate font-medium">{title}</p>
        <p className="text-muted-foreground truncate text-[10px]">{subtitle}</p>
      </div>
    </li>
  )
}

export function AppPreviewMockup() {
  return (
    <div className="bg-card/80 ring-border w-full overflow-hidden rounded-2xl ring-1 backdrop-blur-sm shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <RefetchLogo size={18} />
          <span className="text-foreground text-[11px] font-semibold tracking-tight">refetch</span>
        </div>
        <div className="bg-muted ml-auto flex h-6 max-w-xs flex-1 items-center gap-1.5 rounded-full px-2.5 ring-1 ring-border">
          <Search className="text-muted-foreground size-3" />
          <span className="text-muted-foreground text-[10px]">Search Refetch</span>
        </div>
      </div>

      <div className="grid grid-cols-[140px_minmax(0,1fr)_150px]">
        {/* Sidebar */}
        <aside className="space-y-3 border-r border-border p-2">
          <ul className="space-y-0.5">
            <SidebarItem icon={Home} label="Home" active />
            <SidebarItem icon={TrendingUp} label="Popular" />
            <SidebarItem icon={Compass} label="All" />
          </ul>
          <div className="border-t border-border pt-2">
            <p className="text-muted-foreground/70 mb-1 px-2 text-[9px] tracking-widest">
              YOUR COMMUNITIES
            </p>
            <ul className="space-y-0.5">
              <CommunityRow letter="t" name="r/technology" color="bg-blue-500/80" />
              <CommunityRow letter="g" name="r/gaming" color="bg-rose-500/80" />
              <CommunityRow letter="s" name="r/sports" color="bg-emerald-500/80" />
            </ul>
          </div>
          <div className="border-t border-border pt-2">
            <p className="text-muted-foreground/70 mb-1 px-2 text-[9px] tracking-widest">
              COMMUNITIES
            </p>
            <ul className="space-y-0.5">
              <li className="text-muted-foreground flex items-center gap-2 px-2 py-1 text-[11px]">
                <Plus className="size-3" />
                Create a community
              </li>
            </ul>
          </div>
        </aside>

        {/* Feed */}
        <main className="space-y-2 p-3">
          <div className="text-muted-foreground flex items-center gap-2 text-[10px]">
            <span className="text-foreground bg-muted rounded-full px-1.5 py-0.5">Best</span>
            <span>Hot</span>
            <span>New</span>
            <span>Top</span>
          </div>

          <div className="bg-background/40 ring-border space-y-2 rounded-lg p-2.5 ring-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
              <span className="bg-[var(--brand)]/80 inline-flex size-3 items-center justify-center rounded-full text-[7px] font-bold text-white">
                f
              </span>
              <span className="text-foreground">r/futurology</span>
              <ChevronRight className="size-2.5" />
              <span>5h</span>
            </div>
            <p className="text-foreground text-xs font-medium leading-tight">
              The future of computing is here.
            </p>
            <div
              className="aspect-[16/8] w-full rounded-md ring-1 ring-border"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.4), transparent 55%), radial-gradient(circle at 80% 30%, rgba(255, 255, 255, 0.08), transparent 60%), linear-gradient(135deg, #1f2937 0%, #0f172a 100%)",
              }}
            />
            <div className="text-muted-foreground flex items-center gap-3 pt-1 text-[10px]">
              <span className="inline-flex items-center gap-1">
                <Hash className="size-2.5" /> 2.3k
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="size-2.5" /> 342
              </span>
              <span className="inline-flex items-center gap-1">
                <Share2 className="size-2.5" /> Share
              </span>
            </div>
          </div>
        </main>

        {/* Right rail */}
        <aside className="space-y-2 border-l border-border p-2">
          <p className="text-foreground px-1 text-[10px] font-semibold">Trending Today</p>
          <ul className="space-y-0">
            <TrendingItem rank={1} title="AI breakthroughs" subtitle="r/science · 24.1k upvotes" />
            <TrendingItem rank={2} title="Game of the Year" subtitle="r/gaming · 18.3k upvotes" />
            <TrendingItem rank={3} title="Mars mission update" subtitle="r/space · 12.7k upvotes" />
          </ul>
          <div className="bg-[var(--brand)]/10 ring-[var(--brand)]/30 mt-2 space-y-1 rounded-md p-2 ring-1">
            <p className="text-foreground text-[10px] font-semibold">Refetch Pro</p>
            <p className="text-muted-foreground text-[9px] leading-snug">
              Ad-free browsing, custom app icons, and more.
            </p>
            <p className="text-[var(--brand)] inline-flex items-center gap-0.5 text-[9px] font-medium">
              Learn More <ChevronRight className="size-2.5" />
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

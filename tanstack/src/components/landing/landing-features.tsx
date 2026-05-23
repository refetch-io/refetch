import {
  ArrowRight,
  ArrowUp,
  ChevronDown,
  MessageSquare,
  Share2,
  Users,
  Zap,
} from "lucide-react"

import {
  SectionLabel,
  sectionBodySpacing,
  sectionHeadingIndent,
  sectionPaddingX,
} from "@/components/landing/section-label"
import { cn } from "@/lib/utils"

const featureColumnSeparator =
  "sm:before:bg-border sm:before:absolute sm:before:left-0 sm:before:top-0 sm:before:bottom-0 sm:before:w-px"

function IconBadge({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <span className="bg-muted ring-border inline-flex size-9 items-center justify-center rounded-xl ring-1">
      <Icon className="text-foreground size-4.5" strokeWidth={2} />
    </span>
  )
}

function DiscoverPreview() {
  const items = [
    { name: "r/Popular", letter: "P", color: "bg-[var(--brand)]/80", active: true },
    { name: "r/technology", letter: "t", color: "bg-blue-500/80" },
    { name: "r/space", letter: "s", color: "bg-rose-500/80" },
    { name: "r/science", letter: "s", color: "bg-emerald-500/80" },
  ]
  return (
    <div className="bg-background/60 ring-border mt-auto rounded-xl p-2 ring-1">
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.name}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
              item.active && "bg-muted",
            )}
          >
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-white",
                item.color,
              )}
            >
              {item.letter}
            </span>
            <span className="text-foreground/90 truncate">{item.name}</span>
            {item.active ? (
              <ChevronDown className="text-muted-foreground ml-auto size-3" />
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ConnectPreview() {
  return (
    <div className="bg-background/60 ring-border mt-auto space-y-2 rounded-xl p-3 ring-1">
      <div className="flex items-start gap-2">
        <span className="bg-[var(--brand)]/80 mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white">
          c
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium leading-tight">r/learnprogramming</p>
          <p className="text-muted-foreground text-[10px]">
            Posted by u/curious_dev <span className="text-border">·</span> 2h
          </p>
        </div>
      </div>
      <p className="text-foreground/90 text-xs font-medium">
        Just built my first web app!
      </p>
      <div className="text-muted-foreground flex items-center gap-3 text-[11px]">
        <span className="inline-flex items-center gap-1">
          <ArrowUp className="text-[var(--brand)] size-3" />
          1.2k
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="size-3" />
          128
        </span>
      </div>
    </div>
  )
}

function ContributePreview() {
  return (
    <div className="bg-background/60 ring-border mt-auto space-y-2.5 rounded-xl p-3 ring-1">
      <div className="flex items-center gap-3 text-[11px]">
        <span className="inline-flex items-center gap-1">
          <ArrowUp className="size-3.5 text-[var(--feed-up)]" />
          <span className="font-semibold tabular-nums">2.4k</span>
        </span>
        <span className="text-border">|</span>
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <ArrowUp className="size-3.5 rotate-180" />
        </span>
        <span className="text-border ml-auto">|</span>
        <span className="text-muted-foreground inline-flex items-center gap-1">
          <Share2 className="size-3" />
          Share
        </span>
      </div>
      <div className="bg-muted flex items-center justify-between rounded-md px-2 py-1.5 text-[11px]">
        <span className="text-muted-foreground">Best Comments</span>
        <ChevronDown className="text-muted-foreground size-3" />
      </div>
    </div>
  )
}

const FEATURES = [
  {
    icon: Zap,
    title: "Discover",
    description: "Find fresh perspectives and trending conversations tailored to you.",
    preview: <DiscoverPreview />,
  },
  {
    icon: Users,
    title: "Connect",
    description: "Join communities, share your voice, and build meaningful connections.",
    preview: <ConnectPreview />,
  },
  {
    icon: ArrowUp,
    title: "Contribute",
    description: "Vote, comment, and shape the stories and topics that matter.",
    preview: <ContributePreview />,
  },
] as const

export function LandingFeatures() {
  return (
    <section className="landing-section-inset relative pb-12 md:pb-16">
      <div className={sectionPaddingX}>
        <SectionLabel number="01" />
        <div
          className={cn(
            "grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12",
            sectionBodySpacing,
          )}
        >
          <div className={cn("max-w-md", sectionHeadingIndent)}>
            <h2 className="text-foreground text-3xl font-semibold leading-[1.1] tracking-tight md:text-4xl">
              Refetch is built for curiosity.
            </h2>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
              From breaking news to niche hobbies, Refetch helps you discover what
              matters most.
            </p>
            <a
              href="#"
              className="text-[var(--brand)] hover:text-[var(--brand)]/80 mt-6 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
            >
              Explore features
              <ArrowRight className="size-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={cn(
                  "relative flex flex-col gap-5 py-2 sm:px-8",
                  i > 0 && "border-border border-t pt-8 sm:border-t-0 sm:pt-2",
                  i > 0 && featureColumnSeparator,
                )}
              >
                <IconBadge icon={f.icon} />
                <div>
                  <h3 className="text-foreground text-sm font-semibold">{f.title}</h3>
                  <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
                    {f.description}
                  </p>
                </div>
                {f.preview}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

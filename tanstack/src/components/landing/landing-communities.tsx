import { ArrowRight, Gamepad2, Keyboard, Mountain, UtensilsCrossed } from "lucide-react"

import { SectionLabel } from "@/components/landing/section-label"
import { cn } from "@/lib/utils"

type Community = {
  name: string
  icon: React.ElementType
  iconColor: string
  background: string
}

const COMMUNITIES: Community[] = [
  {
    name: "r/EarthPorn",
    icon: Mountain,
    iconColor: "bg-emerald-500/90",
    background:
      "bg-[linear-gradient(135deg,#1f2937_0%,#0f172a_45%,#1e3a5f_100%)] [background-image:radial-gradient(circle_at_20%_85%,rgba(56,189,248,0.18),transparent_50%),radial-gradient(circle_at_85%_25%,rgba(255,255,255,0.06),transparent_55%),linear-gradient(135deg,#1e293b_0%,#0f172a_45%,#1e3a5f_100%)]",
  },
  {
    name: "r/IndieGaming",
    icon: Gamepad2,
    iconColor: "bg-[var(--brand)]",
    background:
      "[background-image:radial-gradient(circle_at_30%_30%,rgba(168,85,247,0.45),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(99,102,241,0.35),transparent_50%),linear-gradient(135deg,#2e1065_0%,#1e1b4b_100%)]",
  },
  {
    name: "r/Cooking",
    icon: UtensilsCrossed,
    iconColor: "bg-amber-500/90",
    background:
      "[background-image:radial-gradient(circle_at_30%_70%,rgba(251,146,60,0.35),transparent_55%),radial-gradient(circle_at_75%_30%,rgba(245,158,11,0.25),transparent_50%),linear-gradient(135deg,#451a03_0%,#1f1006_100%)]",
  },
  {
    name: "r/MechanicalKeyboards",
    icon: Keyboard,
    iconColor: "bg-zinc-500/90",
    background:
      "[background-image:linear-gradient(135deg,#1f2937_0%,#0f1115_100%),repeating-linear-gradient(90deg,rgba(255,255,255,0.04)_0_8px,transparent_8px_16px)]",
  },
]

function CommunityCard({ community, large }: { community: Community; large?: boolean }) {
  const Icon = community.icon
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl ring-1 ring-white/[0.06]",
        large ? "aspect-[16/9]" : "aspect-[16/9]",
        community.background,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      <div className="absolute bottom-3 left-3 inline-flex items-center gap-2">
        <span
          className={cn(
            "ring-background/20 inline-flex size-7 items-center justify-center rounded-full ring-2 backdrop-blur-sm",
            community.iconColor,
          )}
        >
          <Icon className="size-3.5 text-white" strokeWidth={2.4} />
        </span>
        <span className="text-foreground bg-black/40 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-md">
          {community.name}
        </span>
      </div>
    </div>
  )
}

export function LandingCommunities() {
  return (
    <section className="landing-section-rule relative pt-12 pb-12 md:pt-16 md:pb-16">
      <SectionLabel number="02" />
      <div className="px-4 md:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {COMMUNITIES.map((c) => (
              <CommunityCard key={c.name} community={c} />
            ))}
          </div>

          <div className="max-w-md lg:pl-4">
            <h2 className="text-foreground text-3xl font-semibold leading-[1.1] tracking-tight md:text-4xl">
              A community for
              <br />
              <span className="brand-text">everything</span>
            </h2>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
              No matter your interest, there&apos;s a community waiting for you.
            </p>
            <a
              href="#"
              className="text-[var(--brand)] hover:text-[var(--brand)]/80 mt-6 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
            >
              Browse all communities
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

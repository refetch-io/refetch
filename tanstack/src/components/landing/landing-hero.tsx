import { ArrowUpRight, Flame } from "lucide-react"

import { Button } from "@/components/ui/button"

const TRENDING = [
  { label: "r/ChatGPT", color: "bg-emerald-500", letter: "C" },
  { label: "r/TechNews", color: "bg-zinc-500", letter: "T" },
  { label: "r/AmITheAsshole", color: "bg-orange-500", letter: "A" },
  { label: "r/WorldNews", color: "bg-sky-500", letter: "W" },
] as const

function HeroOrbital() {
  return (
    <img
      src="/hero-orbital.png?v=4"
      alt=""
      aria-hidden
      draggable={false}
      width={1024}
      height={682}
      className="block h-auto w-full max-w-none select-none"
    />
  )
}

export function LandingHero() {
  return (
    <section className="relative">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 -right-6 left-0 hidden overflow-visible md:block lg:-right-10">
          <div className="absolute top-1/2 right-[-6%] w-[min(825px,71%)] min-w-[390px] -translate-y-1/2 lg:right-[-8%] lg:w-[min(885px,74%)]">
            <HeroOrbital />
          </div>
        </div>

        <div className="grid min-h-[520px] items-center gap-10 px-5 pt-12 pb-14 md:grid-cols-2 md:gap-6 md:min-h-[580px] md:px-12 md:pt-16 md:pb-20 lg:min-h-[620px]">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-foreground text-5xl leading-[1.05] font-semibold tracking-tight md:text-6xl">
              Dive into
              <br />
              <span className="brand-text">anything</span>
            </h1>

            <p className="text-muted-foreground mt-5 max-w-md text-[15px] leading-relaxed">
              Refetch is home to thousands of communities, endless conversations,
              and authentic human connection.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 group h-11 gap-1.5 rounded-full px-5 text-sm font-medium text-white shadow-[0_0_0_1px_color-mix(in_oklch,var(--brand)_40%,transparent)]"
              >
                Join Refetch
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/[0.04] border-white/10 hover:bg-white/[0.07] hover:text-foreground h-11 rounded-full border px-5 text-sm font-medium"
              >
                Explore Communities
              </Button>
            </div>

            <div className="mt-10">
              <p className="text-muted-foreground/90 mb-3 inline-flex items-center gap-1.5 text-xs">
                <Flame className="size-3.5 text-[var(--brand)]" />
                Trending on Refetch
              </p>
              <ul className="flex flex-wrap gap-2">
                {TRENDING.map((t) => (
                  <li key={t.label}>
                    <a
                      href="#"
                      className="bg-white/[0.04] hover:bg-white/[0.08] inline-flex items-center gap-2 rounded-full border border-white/10 py-1.5 pr-3 pl-1.5 text-xs font-medium transition-colors"
                    >
                      <span
                        className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${t.color}`}
                      >
                        {t.letter}
                      </span>
                      {t.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="hidden md:block" />
        </div>
      </div>
    </section>
  )
}

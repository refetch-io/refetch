import { ArrowUpRight, TrendingUp } from "lucide-react"

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
      src="/hero.png?v=4"
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
    <section className="relative overflow-visible">
      <div className="pointer-events-none absolute inset-y-0 right-0 left-0 z-0 hidden overflow-visible md:block">
        <div className="absolute top-1/2 right-[-90px] w-[min(880px,58vw)] -translate-y-1/2 lg:w-[min(920px,60vw)]">
          <HeroOrbital />
        </div>
      </div>

      <div className="relative z-10 grid min-h-[420px] items-stretch gap-10 px-5 pb-0 md:grid-cols-2 md:gap-6 md:min-h-[460px] md:px-12 lg:min-h-[500px]">
        <div className="relative flex max-w-xl flex-col justify-center">
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
            <Button variant="brand" size="pill" className="group">
              Join Refetch
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Button>
            <Button variant="brand-outline" size="pill">
              Explore Communities
            </Button>
          </div>

          <div className="mt-12">
            <p className="mb-3 inline-flex items-center gap-1.5 text-xs text-white">
              <TrendingUp className="size-3.5 text-white" />
              Trending on Refetch
            </p>
            <ul className="flex flex-wrap gap-2">
              {TRENDING.map((t) => (
                <li key={t.label}>
                  <a
                    href="#"
                    className="bg-muted hover:bg-muted inline-flex items-center gap-2 rounded-full border border-white/10 py-1.5 pr-3 pl-1.5 text-xs font-medium transition-colors"
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

        <div className="hidden md:block" aria-hidden />
      </div>
    </section>
  )
}

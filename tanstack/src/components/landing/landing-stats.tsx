import { SectionLabel } from "@/components/landing/section-label"

const STATS = [
  { value: "100K+", label: "Active Communities" },
  { value: "500M+", label: "Monthly Conversations" },
  { value: "100M+", label: "Daily Visitors" },
  { value: "20+", label: "Years of Connection" },
] as const

export function LandingStats() {
  return (
    <section className="landing-section-rule relative pt-10 pb-10 md:pt-12 md:pb-12">
      <SectionLabel number="03" />
      <div className="px-4 md:px-10">
        <ul className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
          {STATS.map((stat, i) => (
            <li
              key={stat.label}
              className={`relative flex flex-col items-center gap-1 text-center ${
                i > 0 ? "sm:before:bg-white/[0.06] sm:before:absolute sm:before:left-0 sm:before:top-1/2 sm:before:h-10 sm:before:w-px sm:before:-translate-y-1/2" : ""
              }`}
            >
              <p className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
                {stat.value}
              </p>
              <p className="text-muted-foreground text-xs">{stat.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

import { LandingCommunities } from "@/components/landing/landing-communities"
import { LandingCta } from "@/components/landing/landing-cta"
import { LandingFeatures } from "@/components/landing/landing-features"
import { LandingFooter } from "@/components/landing/landing-footer"
import { LandingHero } from "@/components/landing/landing-hero"
import { LandingNav } from "@/components/landing/landing-nav"
import { LandingStats } from "@/components/landing/landing-stats"

export function LandingPage() {
  return (
    <div className="landing-root min-h-screen">
      <div className="mx-auto w-full max-w-[1440px] px-3 md:px-6 lg:px-10">
        <LandingNav />

        <main className="space-y-0 overflow-visible">
          <div className="landing-hero-bg relative z-10 mb-10 overflow-visible rounded-[28px] border border-white/[0.06] md:mb-14">
            <LandingHero />
          </div>

          <LandingFeatures />
          <LandingCommunities />
          <LandingStats />
          <LandingCta />
        </main>

        <LandingFooter />
      </div>
    </div>
  )
}

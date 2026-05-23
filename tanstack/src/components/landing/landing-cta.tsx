import { AppPreviewMockup } from "@/components/landing/app-preview-mockup"
import { SectionLabel } from "@/components/landing/section-label"
import { Button } from "@/components/ui/button"

export function LandingCta() {
  return (
    <section className="landing-section-rule relative pt-12 pb-16 md:pt-16 md:pb-20">
      <SectionLabel number="04" />
      <div className="px-4 md:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-12">
          <div className="max-w-md">
            <h2 className="text-foreground text-3xl font-semibold leading-[1.1] tracking-tight md:text-4xl">
              Refetch is more <br />
              when you&apos;re <span className="brand-text">in it.</span>
            </h2>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
              Join millions of people exploring, sharing, and connecting every day.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="bg-[var(--brand)] hover:bg-[var(--brand)]/90 h-11 rounded-full px-5 text-sm font-medium text-white"
              >
                Create Account
                <span className="ml-1">→</span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/[0.04] border-white/10 hover:bg-white/[0.07] h-11 rounded-full border px-5 text-sm font-medium"
              >
                Learn More
              </Button>
            </div>
          </div>

          <AppPreviewMockup />
        </div>
      </div>
    </section>
  )
}

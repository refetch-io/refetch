import { ArrowUpRight } from "lucide-react"

import { AppPreviewMockup } from "@/components/landing/app-preview-mockup"
import {
  SectionLabel,
  sectionBodySpacing,
  sectionHeadingIndent,
  sectionPaddingX,
} from "@/components/landing/section-label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function LandingCta() {
  return (
    <section className="landing-section-inset relative pb-16 md:pb-20">
      <div className={sectionPaddingX}>
        <SectionLabel number="04" />
        <div
          className={cn(
            "grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-12",
            sectionBodySpacing,
          )}
        >
          <div className={cn("max-w-md", sectionHeadingIndent)}>
            <h2 className="text-foreground text-3xl font-semibold leading-[1.1] tracking-tight md:text-4xl">
              Refetch is more <br />
              when you&apos;re <span className="brand-text">in it</span>
              <span className="text-foreground">.</span>
            </h2>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
              Join millions of people exploring, sharing, and connecting every day.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button variant="brand" size="pill" className="group">
                Create Account
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Button>
              <Button variant="brand-outline" size="pill">
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

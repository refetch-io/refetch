import { Moon, Sun } from "lucide-react"

const COLUMNS: Array<{ heading: string; links: string[] }> = [
  {
    heading: "GET STARTED",
    links: ["About Refetch", "Careers", "Press", "Brand", "Blog"],
  },
  {
    heading: "COMMUNITIES",
    links: ["Popular", "Topics", "Reddit Recap", "Community Directory"],
  },
  {
    heading: "SUPPORT",
    links: ["Help Center", "Refetch Rules", "Refetch Help", "Accessibility", "Contact Us"],
  },
  {
    heading: "RESOURCES",
    links: ["Advertise", "Refetch Pro", "Developers", "API", "Safety"],
  },
  {
    heading: "LEGAL",
    links: ["Privacy Policy", "User Agreement", "Content Policy", "Moderator Code", "DMCA"],
  },
  {
    heading: "SOCIAL",
    links: ["X (Twitter)", "Instagram", "YouTube", "TikTok", "LinkedIn"],
  },
]

export function LandingFooter() {
  return (
    <footer className="landing-section-rule relative pt-10 pb-8 md:pt-12 md:pb-10">
      <div className="px-4 md:px-10">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-muted-foreground/80 mb-3 text-[10px] font-semibold tracking-widest">
                {col.heading}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-foreground/85 hover:text-foreground text-[13px] transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-white/[0.06] pt-5">
          <p className="text-muted-foreground text-xs">
            © 2025 Refetch, Inc. All rights reserved.
          </p>
          <div className="text-muted-foreground inline-flex items-center gap-2">
            <button
              type="button"
              aria-label="Light theme"
              className="hover:text-foreground inline-flex size-7 items-center justify-center rounded-md transition-colors"
            >
              <Sun className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Dark theme"
              className="text-foreground inline-flex size-7 items-center justify-center rounded-md bg-white/[0.06] transition-colors"
            >
              <Moon className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

import { ThemeToggle } from "@/components/theme/theme-toggle"

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

        <div className="mt-10 flex items-center justify-between border-t border-border pt-5">
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} Refetch, Inc. All rights reserved.
          </p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  )
}

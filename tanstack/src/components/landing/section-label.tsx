import { cn } from "@/lib/utils"

export const sectionPaddingX = "px-4 md:px-10"

export const sectionHeadingIndent = "pl-8 md:pl-10"

export const sectionBodySpacing = "mt-10 md:mt-12"

export function SectionLabel({
  number,
  className,
}: {
  number: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "text-muted-foreground/70 block pt-2.5 font-mono text-[13px] leading-none tracking-widest",
        className,
      )}
    >
      {number}
    </span>
  )
}

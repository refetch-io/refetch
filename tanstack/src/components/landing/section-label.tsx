import { cn } from "@/lib/utils"

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
        "text-muted-foreground/70 absolute top-6 left-4 font-mono text-[11px] tracking-widest md:left-6",
        className,
      )}
    >
      {number}
    </span>
  )
}

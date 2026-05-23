import { cn } from "@/lib/utils"

export function FeedPanel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card",
        "dark:border-transparent dark:bg-card/60 dark:ring-1 dark:ring-border dark:backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  )
}

import { cn } from "@/lib/utils"

type RefetchLogoProps = {
  size?: number
  className?: string
  variant?: "filled" | "ghost"
}

export function RefetchLogo({ size = 32, className, variant = "filled" }: RefetchLogoProps) {
  const isFilled = variant === "filled"
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-[28%]",
        isFilled ? "bg-[var(--brand)]" : "bg-muted ring-1 ring-white/10",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.55}
        height={size * 0.55}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isFilled ? "text-white" : "text-[var(--brand)]"}
      >
        <path d="M5 19L19 5" />
        <path d="M9 5h10v10" />
        <path d="M19 19H9" />
        <path d="M5 19V9" />
      </svg>
    </span>
  )
}

export function RefetchWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-foreground text-base font-semibold tracking-tight",
        className,
      )}
    >
      refetch
    </span>
  )
}

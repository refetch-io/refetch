"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted
    ? theme === "dark" || (theme === "system" && resolvedTheme === "dark")
    : true

  const activeClass =
    "bg-card text-foreground ring-1 ring-border"
  const inactiveClass =
    "text-muted-foreground hover:text-foreground"

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/70 p-0.5",
        className,
      )}
      role="group"
      aria-label="Theme"
    >
      <button
        type="button"
        aria-label="Light theme"
        aria-pressed={!isDark}
        onClick={() => setTheme("light")}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-md transition-colors",
          !isDark ? activeClass : inactiveClass,
        )}
      >
        <Sun className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="Dark theme"
        aria-pressed={isDark}
        onClick={() => setTheme("dark")}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-md transition-colors",
          isDark ? activeClass : inactiveClass,
        )}
      >
        <Moon className="size-3.5" />
      </button>
    </div>
  )
}

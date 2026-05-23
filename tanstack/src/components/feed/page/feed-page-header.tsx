"use client"

import { useState } from "react"

import { SiteSearch } from "@/components/site/site-search"
import { cn } from "@/lib/utils"

export const feedPageTopPadding = "pt-4 md:pt-6"

const FEED_TABS = ["For you", "Following", "Trending"] as const

type FeedTab = (typeof FEED_TABS)[number]

export function FeedPageTitle({ className }: { className?: string }) {
  return (
    <div className={cn("mb-5", feedPageTopPadding, className)}>
      <h1 className="text-foreground m-0 text-3xl leading-none font-semibold tracking-tight md:text-4xl">
        The <span className="brand-text">feed</span>
        <span className="text-foreground">.</span>
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Real people, real conversations, real-time.
      </p>
    </div>
  )
}

export function FeedPageTabs({ className }: { className?: string }) {
  const [tab, setTab] = useState<FeedTab>("For you")

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-b border-border",
        className,
      )}
    >
        <div className="flex items-center gap-6">
          {FEED_TABS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setTab(label)}
              className={cn(
                "relative cursor-pointer py-2 pb-3 text-sm font-medium transition-colors",
                tab === label
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80",
              )}
            >
              {label}
              {tab === label ? (
                <span className="bg-foreground absolute right-0 bottom-0 left-0 h-0.5 rounded-full" />
              ) : null}
            </button>
          ))}
        </div>

      <SiteSearch className="w-full shrink-0 sm:w-auto sm:min-w-[12rem] md:min-w-[13rem]" />
    </div>
  )
}

/** @deprecated Use FeedPageTitle + FeedPageTabs in the feed grid layout */
export function FeedPageHeader({ className }: { className?: string }) {
  return (
    <header className={cn("min-w-0", className)}>
      <FeedPageTitle />
      <FeedPageTabs />
    </header>
  )
}

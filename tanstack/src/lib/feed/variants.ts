export const FEED_DESIGN_VARIANTS = [
  {
    id: "classic",
    name: "Classic",
    description: "Vote rail + card rows",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Flush list, max density",
  },
  {
    id: "glass",
    name: "Glass",
    description: "Soft translucent panels",
  },
  {
    id: "compact",
    name: "Compact",
    description: "One-line scan mode",
  },
  {
    id: "magazine",
    name: "Magazine",
    description: "Story-first hero layout",
  },
  {
    id: "timeline",
    name: "Timeline",
    description: "Stream with spine",
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Dev log monospace",
  },
  {
    id: "neon",
    name: "Signal",
    description: "Accent glow highlight",
  },
  {
    id: "split",
    name: "Split",
    description: "Score rail on the right",
  },
  {
    id: "stacked",
    name: "Stacked",
    description: "Tile with score chip",
  },
] as const

export type FeedDesignVariantId = (typeof FEED_DESIGN_VARIANTS)[number]["id"]

export const DEFAULT_FEED_DESIGN_VARIANT: FeedDesignVariantId = "classic"

export const FEED_VARIANT_STORAGE_KEY = "refetch-feed-design-variant"

export function isFeedDesignVariantId(value: string): value is FeedDesignVariantId {
  return FEED_DESIGN_VARIANTS.some((v) => v.id === value)
}

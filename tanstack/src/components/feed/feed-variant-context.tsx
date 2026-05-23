import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  DEFAULT_FEED_DESIGN_VARIANT,
  FEED_VARIANT_STORAGE_KEY,
  type FeedDesignVariantId,
  isFeedDesignVariantId,
} from "@/lib/feed/variants"

type FeedVariantContextValue = {
  variant: FeedDesignVariantId
  setVariant: (variant: FeedDesignVariantId) => void
}

const FeedVariantContext = createContext<FeedVariantContextValue | null>(null)

function readStoredVariant(): FeedDesignVariantId {
  if (typeof window === "undefined") return DEFAULT_FEED_DESIGN_VARIANT
  const stored = localStorage.getItem(FEED_VARIANT_STORAGE_KEY)
  if (stored && isFeedDesignVariantId(stored)) return stored
  return DEFAULT_FEED_DESIGN_VARIANT
}

export function FeedVariantProvider({ children }: { children: ReactNode }) {
  const [variant, setVariantState] = useState<FeedDesignVariantId>(readStoredVariant)

  const setVariant = useCallback((next: FeedDesignVariantId) => {
    setVariantState(next)
    localStorage.setItem(FEED_VARIANT_STORAGE_KEY, next)
  }, [])

  const value = useMemo(() => ({ variant, setVariant }), [variant, setVariant])

  return (
    <FeedVariantContext.Provider value={value}>{children}</FeedVariantContext.Provider>
  )
}

export function useFeedVariant() {
  const ctx = useContext(FeedVariantContext)
  if (!ctx) {
    throw new Error("useFeedVariant must be used within FeedVariantProvider")
  }
  return ctx
}

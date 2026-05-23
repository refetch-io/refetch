import { LayoutGrid } from "lucide-react"

import { useFeedVariant } from "@/components/feed/feed-variant-context"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FEED_DESIGN_VARIANTS,
  type FeedDesignVariantId,
} from "@/lib/feed/variants"

export function FeedVariantPicker() {
  const { variant, setVariant } = useFeedVariant()
  const active = FEED_DESIGN_VARIANTS.find((v) => v.id === variant)

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[220px]">
      <Label htmlFor="feed-design-variant" className="sr-only">
        Layout
      </Label>
      <LayoutGrid className="text-muted-foreground hidden size-4 sm:block" aria-hidden />
      <Select
        value={variant}
        onValueChange={(v) => setVariant(v as FeedDesignVariantId)}
      >
        <SelectTrigger
          id="feed-design-variant"
          size="sm"
          className="bg-background/80 h-8 w-full border-border/80 text-xs"
        >
          <SelectValue placeholder="Layout">{active?.name}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {FEED_DESIGN_VARIANTS.map((v) => (
            <SelectItem key={v.id} value={v.id} className="text-xs">
              <span className="font-medium">{v.name}</span>
              <span className="text-muted-foreground ml-2 hidden sm:inline">
                — {v.description}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SiteSearchProps = {
  className?: string
  inputClassName?: string
}

export function SiteSearch({ className, inputClassName }: SiteSearchProps) {
  return (
    <div className={cn("relative w-full md:w-52 lg:w-64", className)}>
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2"
        strokeWidth={2}
        aria-hidden
      />
      <Input
        type="search"
        placeholder="Search Refetch"
        className={cn(
          "h-9 rounded-full border-input bg-card/70 py-0 pr-3 pl-9 text-sm shadow-none focus-visible:ring-2",
          "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
          inputClassName,
        )}
      />
    </div>
  )
}

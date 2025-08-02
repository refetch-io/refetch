"use client"

import { Search, Filter, ArrowUpDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export function SearchAndFilter() {
  return (
    <div className="flex items-center gap-2 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" /> {/* Smaller icon */}
        <Input
          placeholder="Search articles..."
          className="pl-8 bg-white border-gray-200 text-gray-800 placeholder:text-gray-400 h-8 text-sm"
        />{" "}
        {/* Smaller height and padding, smaller text */}
      </div>
      {/* Filter Button with Icon */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent">
            {" "}
            {/* Smaller button */}
            <Filter className="h-3 w-3" /> {/* Smaller icon */}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem>All</DropdownMenuItem>
          <DropdownMenuItem>Today</DropdownMenuItem>
          <DropdownMenuItem>This Week</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Popular</DropdownMenuItem>
          <DropdownMenuItem>Newest</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Sort Button with Icon */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent">
            {" "}
            {/* Smaller button */}
            <ArrowUpDown className="h-3 w-3" /> {/* Smaller icon */}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem>Top</DropdownMenuItem>
          <DropdownMenuItem>New</DropdownMenuItem>
          <DropdownMenuItem>Old</DropdownMenuItem>
          <DropdownMenuItem>Most Commented</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

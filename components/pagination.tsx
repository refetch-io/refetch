"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, hasNextPage, hasPrevPage, onPageChange }: PaginationProps) {
  const handlePageChange = (page: number) => {
    // Call the page change handler first
    onPageChange(page)
    // Then immediately jump to top
    window.scrollTo(0, 0)
  }

  return (
    <div className="flex justify-center items-center gap-2 mt-8 mb-12">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={!hasPrevPage}
        aria-label="Go to previous page"
        className={`w-6 h-6 p-0 rounded-full transition-all duration-200 ${
          hasPrevPage 
            ? 'bg-[#4e1cb3] hover:bg-[#4e1cb3]/80 text-white' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        <ChevronLeft className="h-3 w-3" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={!hasNextPage}
        aria-label="Go to next page"
        className={`w-6 h-6 p-0 rounded-full transition-all duration-200 ${
          hasNextPage 
            ? 'bg-[#4e1cb3] hover:bg-[#4e1cb3]/80 text-white' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  )
}

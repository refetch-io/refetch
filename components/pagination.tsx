"use client"

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface PaginationProps {
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  onPageChange: (page: number) => Promise<void>
  isLoading?: boolean
}

export function Pagination({ 
  currentPage, 
  hasNextPage, 
  hasPrevPage, 
  onPageChange, 
  isLoading = false 
}: PaginationProps) {
  const [isNavigating, setIsNavigating] = useState(false)
  const [navigatingDirection, setNavigatingDirection] = useState<'prev' | 'next' | null>(null)

  const handlePageChange = async (page: number, direction: 'prev' | 'next') => {
    if (isNavigating || isLoading) return
    
    setIsNavigating(true)
    setNavigatingDirection(direction)
    
    try {
      // Call the page change handler and wait for it to complete
      await onPageChange(page)
      
      // Always scroll to top after new content loads
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    } catch (error) {
      console.error('Error changing page:', error)
    } finally {
      setIsNavigating(false)
      setNavigatingDirection(null)
    }
  }

  const isDisabled = isNavigating || isLoading

  return (
    <div className="flex justify-center items-center gap-2 mt-8 mb-12 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1, 'prev')}
        disabled={!hasPrevPage || isDisabled}
        aria-label="Go to previous page"
        className={`w-6 h-6 p-0 rounded-full transition-all duration-200 ${
          hasPrevPage && !isDisabled
            ? 'bg-[#4e1cb3] hover:bg-black hover:text-white text-white' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        } ${isDisabled ? 'opacity-50' : ''}`}
      >
        <ChevronLeft className="h-3 w-3" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1, 'next')}
        disabled={!hasNextPage || isDisabled}
        aria-label="Go to next page"
        className={`w-6 h-6 p-0 rounded-full transition-all duration-200 ${
          hasNextPage && !isDisabled
            ? 'bg-[#4e1cb3] hover:bg-black hover:text-white text-white' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        } ${isDisabled ? 'opacity-50' : ''}`}
      >
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  const toggleVisibility = useCallback(() => {
    // Show button if scrolled down at all (i.e., not at the very top of the page)
    if (window.scrollY > 0) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility)
    // Also check on mount in case the page loads with a scroll position (e.g., after refresh)
    toggleVisibility()
    return () => {
      window.removeEventListener("scroll", toggleVisibility)
    }
  }, [toggleVisibility])

  return (
    <Button
      variant="default"
      size="icon"
      className={`fixed bottom-6 right-6 rounded-full bg-[#4e1cb3] hover:bg-[#5d2bc4] text-white shadow-lg z-50 h-8 w-8
        ${isVisible ? "translate-y-0" : "translate-y-16 pointer-events-none"}`}
      onClick={scrollToTop}
      aria-label="Scroll to top"
    >
      <ChevronUp className="h-5 w-5" />
    </Button>
  )
}

"use client"

import { useState, useEffect, useMemo } from "react"
import { Chrome, X, Download, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BrowserInfo {
  name: string
  icon: React.ComponentType<{ className?: string }>
  extensionUrl: string
}

const BROWSERS: { [key: string]: BrowserInfo } = {
  chrome: {
    name: "Chrome",
    icon: Chrome,
    extensionUrl: "https://github.com/your-username/refetch/tree/main/extensions/chrome"
  },
  firefox: {
    name: "Firefox", 
    icon: Globe,
    extensionUrl: "https://addons.mozilla.org/en-US/firefox/addon/refetch/"
  }
}

// Memoized browser detection to prevent recalculation
const useBrowserDetection = () => {
  return useMemo(() => {
    if (typeof window === 'undefined') return null
    
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes("chrome") && !userAgent.includes("edg") && !userAgent.includes("opera")) {
      return BROWSERS.chrome
    } else if (userAgent.includes("firefox")) {
      return BROWSERS.firefox
    }
    
    return null
  }, [])
}

export function BrowserExtensionCTA() {
  const browser = useBrowserDetection()
  const [isDismissed, setIsDismissed] = useState<boolean | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Check if user has already dismissed the CTA
    const dismissed = localStorage.getItem("refetch-extension-dismissed")
    const shouldShow = dismissed !== "true" && browser !== null
    
    if (shouldShow) {
      // Small delay for smooth animation
      const timer = setTimeout(() => setIsVisible(true), 200)
      return () => clearTimeout(timer)
    } else {
      setIsDismissed(dismissed === "true")
    }
  }, [browser])

  const handleDismiss = () => {
    setIsVisible(false)
    // Wait for animation to complete before updating state
    setTimeout(() => {
      setIsDismissed(true)
      localStorage.setItem("refetch-extension-dismissed", "true")
    }, 400)
  }

  const handleInstall = () => {
    if (browser) {
      const urlWithRef = `${browser.extensionUrl}${browser.extensionUrl.includes('?') ? '&' : '?'}ref=refetch.io`
      window.open(urlWithRef, "_blank", "noopener,noreferrer")
    }
  }

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return null
  }

  // Don't render if dismissed or no supported browser
  if (isDismissed === true || !browser) {
    return null
  }

  const BrowserIcon = browser.icon

  return (
    <div 
      className={`bg-transparent border border-gray-200 rounded-lg p-3 -mt-2 mb-6 transition-all duration-400 ease-out ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform -translate-y-2'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Browser Icon */}
          <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
            <BrowserIcon className="w-5 h-5 text-gray-600" />
          </div>
          
          {/* Text */}
          <span className="text-sm text-gray-700">
            Install our {browser.name} extension to make Refetch your homepage
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleInstall}
            className="bg-[#4e1cb3] hover:bg-[#5d2bc4] text-white h-8 px-3 text-sm"
          >
            <Download className="w-3 h-3 mr-1" />
            Install
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 
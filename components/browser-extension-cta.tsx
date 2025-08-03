"use client"

import { useState, useEffect } from "react"
import { Chrome, Firefox, X, Download } from "lucide-react"
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
    icon: Firefox,
    extensionUrl: "https://addons.mozilla.org/en-US/firefox/addon/refetch/"
  }
}

export function BrowserExtensionCTA() {
  const [browser, setBrowser] = useState<BrowserInfo | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if user has already dismissed the CTA
    const dismissed = localStorage.getItem("refetch-extension-dismissed")
    if (dismissed) {
      setIsDismissed(true)
      return
    }

    // Detect browser
    const userAgent = navigator.userAgent.toLowerCase()
    let detectedBrowser: BrowserInfo | null = null

    if (userAgent.includes("chrome") && !userAgent.includes("edg") && !userAgent.includes("opera")) {
      detectedBrowser = BROWSERS.chrome
    } else if (userAgent.includes("firefox")) {
      detectedBrowser = BROWSERS.firefox
    }

    if (detectedBrowser) {
      setBrowser(detectedBrowser)
      // Show the CTA immediately
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    localStorage.setItem("refetch-extension-dismissed", "true")
  }

  const handleInstall = () => {
    if (browser) {
      window.open(browser.extensionUrl, "_blank", "noopener,noreferrer")
    }
  }

  if (!browser || isDismissed || !isVisible) {
    return null
  }

  const BrowserIcon = browser.icon

  return (
    <div className="bg-transparent border border-gray-200 rounded-lg p-3 mb-4">
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
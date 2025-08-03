"use client"
import Image from "next/image"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LeftSidebar } from "@/components/left-sidebar"
import { BackToTopButton } from "@/components/back-to-top-button"
import { MobileNavigation } from "@/components/mobile-navigation"
import { BrowserExtensionCTA } from "@/components/browser-extension-cta"
import { useState } from "react"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-100 font-body">
      {/* Header - Fixed to Top */}
      <header className="bg-[#4e1cb3] text-white py-2 fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between pr-4 sm:pr-6">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Button - Only visible on mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-[#5d2bc4] rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
            
            <Link href="/" passHref>
              <Image 
                src="/logo.png" 
                alt="Refetch Logo" 
                width={102} 
                height={23} 
                className="rounded cursor-pointer"
                style={{ width: '102px', height: '23px' }}
              />
            </Link>
            
            {/* Separator */}
            <div className="w-px h-6 bg-white/30 mx-3"></div>
            
            {/* Tagline */}
            <span className="text-white/80 text-sm font-thin hidden sm:block">
              Open-source & non-profit alternative to YC-controlled HN 
            </span>
          </div>

          {/* Sign In Button - Always on the right */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-white bg-[#5d2bc4] hover:bg-white/10 hover:text-white h-8 px-3 text-sm">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Browser Extension CTA - Above all sections */}
      <div className="max-w-7xl mx-auto pr-4 sm:pr-6 pt-[60px]">
        <BrowserExtensionCTA />
      </div>

      {/* Main content wrapper with padding to account for fixed header */}
      <div className="max-w-7xl mx-auto flex flex-wrap gap-4 lg:gap-6 pr-4 sm:pr-6 pb-[50px]">
        {/* Left Sidebar */}
        <LeftSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col pt-0 mt-0 min-w-0">
          {children}
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <MobileNavigation 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
      
      <BackToTopButton />
    </div>
  )
} 
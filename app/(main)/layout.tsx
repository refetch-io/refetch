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
import { useAuth } from "@/hooks/use-auth"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, loading, getUserDisplayName, isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-gray-100 font-body">
      {/* Header - Fixed to Top */}
      <header className="bg-[#4e1cb3] text-white py-2 fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between pr-4 pl-4 sm:pr-6">
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
              Open-source tech news & discussions 
            </span>
          </div>

          {/* CTA Buttons - Submit as primary, Sign In/User as secondary */}
          <div className="flex items-center gap-2">
            {!loading && (
              isAuthenticated ? (
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10 hover:text-white h-8 px-3 text-sm"
                  asChild
                >
                  <Link href="https://refetch.authui.site/">
                    {getUserDisplayName()}
                  </Link>
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10 hover:text-white h-8 px-3 text-sm"
                  asChild
                >
                  <Link href="https://refetch.authui.site/">
                    Sign In
                  </Link>
                </Button>
              )
            )}
            <Button className="bg-white text-[#4e1cb3] hover:bg-gray-100 h-8 px-4 text-sm font-medium">
              Submit
            </Button>
          </div>
        </div>
      </header>

      {/* Browser Extension CTA - Above all sections */}
      <div className="max-w-7xl mx-auto pr-4 pl-4 sm:pr-6 pt-[60px]">
        <BrowserExtensionCTA />
      </div>

      {/* Main content wrapper with padding to account for fixed header */}
      <div className="max-w-7xl mx-auto flex flex-wrap gap-4 lg:gap-6 pr-4 pl-4 sm:pr-6 pb-[50px]">
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
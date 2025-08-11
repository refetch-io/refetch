"use client"
import { LeftSidebar } from "@/components/left-sidebar"
import { BackToTopButton } from "@/components/back-to-top-button"
import { MobileNavigation } from "@/components/mobile-navigation"
import { BrowserExtensionCTA } from "@/components/browser-extension-cta"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useState } from "react"
import { usePathname } from "next/navigation"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  
  // Check if current page should use full-width layout (no sidebars)
  const isFullWidth = pathname === '/submit' || pathname === '/login' || pathname === '/signup' || pathname.startsWith('/threads/')

  return (
    <div className="min-h-screen bg-gray-100 font-body">
      {/* Header - Fixed to Top */}
      <Header 
        onMobileMenuClick={() => setMobileMenuOpen(true)}
        showMobileMenuButton={!isFullWidth}
      />

      {/* Browser Extension CTA - Above all sections */}
      <div className="max-w-7xl mx-auto pr-4 pl-4 sm:pr-6 pt-[80px]">
        <BrowserExtensionCTA />
      </div>

      {/* Main content wrapper with padding to account for fixed header */}
      <div className={`max-w-7xl mx-auto pr-4 pl-4 sm:pr-6 ${isFullWidth ? 'pb-0' : 'pb-[50px]'} ${isFullWidth ? '' : 'flex flex-wrap gap-4 lg:gap-6'}`}>
        {/* Left Sidebar - Only show if not full-width */}
        {!isFullWidth && <LeftSidebar />}

        {/* Main Content Area */}
        <div className={`${isFullWidth ? 'max-w-2xl mx-auto' : 'flex-1 flex flex-col pt-0 mt-0 min-w-0'}`}>
          {children}
        </div>
      </div>
      
      {/* Footer - Only show on submit page */}
      {isFullWidth && (
        <div className="max-w-2xl mx-auto pr-4 pl-4 sm:pr-6">
          <Footer variant="bottom" />
          {/* Add extra margin below footer when comment form is fixed (thread pages) */}
          {pathname.startsWith('/threads/') && (
            <div className="h-56"></div>
          )}
        </div>
      )}
      
      {/* Mobile Navigation */}
      <MobileNavigation 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
      
      <BackToTopButton />
    </div>
  )
} 
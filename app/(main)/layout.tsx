"use client"
import { LeftSidebar } from "@/components/left-sidebar"
import { BackToTopButton } from "@/components/back-to-top-button"
import { MobileNavigation } from "@/components/mobile-navigation"
import { BrowserExtensionCTA } from "@/components/browser-extension-cta"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { Copy, Flag, Check } from "lucide-react"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  
  // Check if current page should use full-width layout (no sidebars)
  const isFullWidth = pathname === '/submit' || pathname === '/login' || pathname === '/signup'
  
  // Check if current page is a threads page
  const isThreadsPage = pathname.startsWith('/threads/')

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
      <div className={`max-w-7xl mx-auto pr-4 pl-4 sm:pr-6 ${isFullWidth || isThreadsPage ? 'pb-0' : 'pb-[50px]'} ${isFullWidth ? '' : 'flex flex-wrap gap-4 lg:gap-6'}`}>
        {/* Left Sidebar - Show on all pages except full-width pages */}
        {!isFullWidth && <LeftSidebar isThreadsPage={isThreadsPage} />}

        {/* Main Content Area */}
        <div className={`${isFullWidth ? 'max-w-2xl mx-auto' : 'flex-1 flex flex-col pt-0 mt-0 min-w-0'} ${isThreadsPage ? 'max-w-4xl' : ''}`}>
          {children}
        </div>

        {/* Right Sidebar - Only show on threads pages */}
        {isThreadsPage && (
          <aside className="hidden lg:block w-56 sticky top-20 h-fit pl-6">
            <div className="bg-white rounded-lg">
              <h3 className="font-normal text-gray-900 mb-2 px-4 pt-2 font-heading text-sm">Actions</h3>
              {/* Separator between title and first item */}
              <div className="h-px bg-gray-100" />
              <div className="space-y-0">
                <div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href)
                      const button = event?.target as HTMLButtonElement
                      if (button) {
                        const originalText = button.innerHTML
                        button.innerHTML = '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Copied!'
                        setTimeout(() => {
                          button.innerHTML = originalText
                        }, 2000)
                      }
                    }}
                    className="w-full text-left text-xs text-gray-700 hover:text-blue-600 hover:bg-gray-50 py-2 px-4 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </button>
                </div>
                <div className="h-px bg-gray-100" />
                <div>
                  <button className="w-full text-left text-xs text-gray-700 hover:text-red-600 hover:bg-gray-50 py-2 px-4 transition-colors flex items-center gap-2 cursor-pointer">
                    <Flag className="h-4 w-4" />
                    Report
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
      
      {/* Footer - Only show on submit page, not on threads pages */}
      {isFullWidth && (
        <div className="max-w-2xl mx-auto pr-4 pl-4 sm:pr-6">
          <Footer variant="bottom" />
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
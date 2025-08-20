"use client"
import { LeftSidebar } from "@/components/left-sidebar"
import { BackToTopButton } from "@/components/back-to-top-button"
import { MobileNavigation } from "@/components/mobile-navigation"
// import { BrowserExtensionCTA } from "@/components/browser-extension-cta"
import { Header } from "@/components/header"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { Copy, Flag, Check } from "lucide-react"
import { ThreadActions } from "@/components/thread-actions"
import { Footer } from "@/components/footer"

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
        {/* <BrowserExtensionCTA /> */}
      </div>

      {/* Main content wrapper with padding to account for fixed header */}
      <div className={`max-w-7xl mx-auto pr-4 pl-4 sm:pr-6 ${isFullWidth ? '' : 'flex flex-wrap gap-4 lg:gap-6'}`}>
        {/* Left Sidebar - Show on all pages except full-width pages */}
        {!isFullWidth && <LeftSidebar isThreadsPage={isThreadsPage} />}

        {/* Main Content Area */}
        <div className={`${isFullWidth ? 'max-w-2xl mx-auto' : 'flex-1 flex flex-col pt-0 mt-0 min-w-0'} ${isThreadsPage ? 'max-w-4xl' : ''}`}>
          {children}
        </div>

        {/* Right Sidebar - Only show on threads pages */}
        {isThreadsPage && (
          <aside className="hidden lg:block w-56 sticky top-20 h-fit pl-6">
            <ThreadActions postId={pathname.split('/')[2]} />
          </aside>
        )}
      </div>
      
      {/* Footer for full-width pages only */}
      {isFullWidth && (
        <div className="max-w-2xl mx-auto pr-4 pl-4 sm:pr-6 mt-20">
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
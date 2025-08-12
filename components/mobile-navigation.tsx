"use client"

import { TrendingUp, Clock, Monitor, X, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Footer } from "@/components/footer"

interface MobileNavigationProps {
  isOpen: boolean
  onClose: () => void
}

// Navigation item interface - matching left sidebar
interface NavigationItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  isSpecial?: boolean
  requiresAuth?: boolean
}

// Navigation configuration - matching left sidebar
const navigationItems: NavigationItem[] = [
  {
    href: "/",
    label: "Top",
    icon: TrendingUp,
    badge: "+1k",
    isSpecial: true
  },
  {
    href: "/show",
    label: "Show",
    icon: Monitor
  },
  {
    href: "/new",
    label: "New",
    icon: Clock
  },
  {
    href: "/mines",
    label: "Mines",
    icon: User,
    requiresAuth: true
  }
]

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const pathname = usePathname()
  const { isAuthenticated, user } = useAuth()

  const handleNavigationClick = (item: NavigationItem) => {
    if (item.requiresAuth && !isAuthenticated) {
      window.location.href = '/login'
      return
    }
    onClose()
  }

  const getUserDisplayName = () => {
    if (!user) return 'Guest';
    if (user.name && user.name.trim()) {
      return user.name;
    }
    return user.email || 'User';
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Mobile Navigation Panel */}
      <div 
        className={`fixed top-0 left-0 h-full w-80 bg-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header with close button - aligned with main header height */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 h-[52px]">
          <Image 
            src="/logo.png" 
            alt="Refetch Logo" 
            width={102} 
            height={23} 
            className="rounded"
            style={{ width: '102px', height: '23px' }}
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* User Info Section */}
        {isAuthenticated && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Welcome back, <span className="font-medium text-gray-900">{getUserDisplayName()}</span>
              </span>
            </div>
          </div>
        )}

        {/* Navigation Content */}
        <div className="flex flex-col h-full">
          {/* Navigation Items */}
          <div className="p-4 pb-2 flex-shrink-0">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const IconComponent = item.icon
                const isActive = pathname === item.href
                
                return (
                  <div
                    key={item.href}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer h-10 ${
                      isActive ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleNavigationClick(item)}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? 'text-gray-600' : 'text-gray-400'
                      }`} />
                      <span className={`text-sm leading-5 ${
                        isActive ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                    {item.badge && (
                      <Badge variant="secondary" className="bg-[#4e1cb3] text-white text-xs leading-4 flex-shrink-0">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 pt-2 border-t border-gray-200 flex-1 overflow-y-auto max-h-[550px]  mb-3">
            <Footer />
          </div>
        </div>
      </div>
    </>
  )
} 
"use client"

import { TrendingUp, Clock, BarChart3, Heart, Monitor, Briefcase, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Footer } from "@/components/footer"
import { useAuth } from "@/contexts/auth-context"

// Navigation item interface
interface NavigationItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  isSpecial?: boolean // For items that need different styling (like Top)
  requiresAuth?: boolean // For items that require authentication
}

// Navigation configuration
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
  // {
  //   href: "/jobs",
  //   label: "Jobs",
  //   icon: Briefcase
  // },
  // {
  //   href: "/rising",
  //   label: "Rising",
  //   icon: BarChart3
  // },
  {
    href: "/mines",
    label: "Mines",
    icon: User,
    requiresAuth: true
  },
  // {
  //   href: "/saved",
  //   label: "Saved",
  //   icon: Heart,
  //   requiresAuth: true
  // }
]

// Navigation link component
function NavigationLink({ item, isActive }: { item: NavigationItem; isActive: boolean }) {
  const IconComponent = item.icon
  const { isAuthenticated } = useAuth()
  
  const handleClick = (e: React.MouseEvent) => {
    if (item.requiresAuth && !isAuthenticated) {
      e.preventDefault()
      window.location.href = '/login'
      return
    }
  }
  
  const containerClasses = `flex items-center justify-between p-2 rounded-lg h-10 ${
    isActive 
      ? "bg-white" 
      : "hover:bg-gray-50"
  }`
  
  const iconClasses = `w-4 h-4 flex-shrink-0 ${
    isActive ? "text-gray-400" : "text-gray-400"
  }`
  
  const textClasses = `text-sm leading-5 ${
    isActive 
      ? "" 
      : "text-gray-600"
  }`
  
  return (
    <Link href={item.href} passHref>
      <div className={containerClasses} onClick={handleClick}>
        <div className="flex items-center gap-3">
          <IconComponent className={iconClasses} />
          <span className={textClasses}>{item.label}</span>
        </div>
        {item.badge && (
          <Badge variant="secondary" className="bg-[#4e1cb3] text-white text-xs leading-4 flex-shrink-0">
            {item.badge}
          </Badge>
        )}
      </div>
    </Link>
  )
}

interface LeftSidebarProps {
  isThreadsPage?: boolean
}

export function LeftSidebar({ isThreadsPage = false }: LeftSidebarProps) {
  const pathname = usePathname()
  
  if (isThreadsPage) {
    // On threads pages: only show footer at bottom
    return (
      <aside className="hidden lg:block w-full sm:w-56 lg:w-56 sticky top-20" style={{ height: 'calc(100vh - 5rem)' }}>
        <div className="h-full flex flex-col">
          {/* Spacer to push footer to bottom */}
          <div className="flex-1"></div>
          
          {/* Footer positioned at the bottom */}
          <div className="pb-4">
            <Footer variant="sidebar" />
          </div>
        </div>
      </aside>
    )
  }
  
  // On main pages: show navigation with footer below
  return (
    <aside className="hidden lg:block w-full sm:w-56 lg:w-56 sticky top-20 h-fit">
      <div className="pr-4 pb-4">
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <NavigationLink
              key={item.href}
              item={item}
              isActive={pathname === item.href}
            />
          ))}
        </div>
      </div>
      
      {/* Footer positioned below navigation */}
      <Footer variant="sidebar" />
    </aside>
  )
}

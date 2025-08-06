"use client"

import Image from "next/image"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

interface HeaderProps {
  onMobileMenuClick?: () => void
  showMobileMenuButton?: boolean
}

export function Header({ onMobileMenuClick, showMobileMenuButton = false }: HeaderProps) {
  const { user, loading, getUserDisplayName, isAuthenticated } = useAuth()

  return (
    <header className="bg-[#4e1cb3] text-white py-2 fixed top-0 w-full z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between pr-4 pl-4 sm:pr-6">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Button - Only visible on mobile when showMobileMenuButton is true */}
          {showMobileMenuButton && (
            <button
              onClick={onMobileMenuClick}
              className="lg:hidden p-2 hover:bg-[#5d2bc4] rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
          )}
          
          <Link href="/" passHref prefetch>
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
            Open-source alternative to YC-controlled HN
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
          <Button className="bg-white text-[#4e1cb3] hover:bg-gray-100 h-8 px-4 text-sm font-medium" asChild>
            <Link href="/submit" prefetch>
              Submit
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
} 
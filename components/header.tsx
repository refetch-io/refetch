"use client"

import Image from "next/image"
import Link from "next/link"
import { Menu, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

interface HeaderProps {
  onMobileMenuClick?: () => void
  showMobileMenuButton?: boolean
}

export function Header({ onMobileMenuClick, showMobileMenuButton = false }: HeaderProps) {
  const { user, getUserDisplayName, isAuthenticated, logout, loading } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

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
          <div className={`transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}>
            {!loading && (isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-sm hidden sm:block">
                  {getUserDisplayName()}
                </span>
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10 hover:text-white h-8 px-2 text-sm"
                  onClick={handleLogout}
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="sr-only">Sign Out</span>
                </Button>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/10 hover:text-white h-8 px-3 text-sm"
                asChild
              >
                <Link href="/login">
                  Sign In
                </Link>
              </Button>
            ))}
          </div>
          <Button className="bg-white text-[#4e1cb3] hover:bg-gray-100 h-8 px-4 text-sm font-medium" asChild>
            <Link href={!loading && isAuthenticated ? "/submit" : "/login"} prefetch>
              Submit
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
} 
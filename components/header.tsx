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
          
          {/* GitHub Stars Counter */}
          <a
            href="https://github.com/refetch-io/refetch"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm hidden sm:flex border border-white/20 rounded-lg px-2 py-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span className="font-medium">22</span>
          </a>
          
          {/* Tagline */}
          <a
            href="https://github.com/refetch-io/refetch"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 hover:text-white transition-colors text-sm font-thin hidden lg:block"
          >
            Open-source alternative to YC-controlled HN
          </a>
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
                <Link href="/signin">
                  Sign In
                </Link>
              </Button>
            ))}
          </div>
          <Button className="bg-white text-[#4e1cb3] hover:bg-gray-100 h-8 px-4 text-sm font-medium" asChild>
            <Link href={!loading && isAuthenticated ? "/submit" : "/signin"} prefetch>
              Submit
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
} 
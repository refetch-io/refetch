"use client"

import Image from "next/image"
import { Twitter, Facebook, Github } from "lucide-react"

interface FooterProps {
  variant?: 'sidebar' | 'bottom'
  bottomPadding?: number
}

export function Footer({ variant = 'sidebar', bottomPadding }: FooterProps) {
  const isBottom = variant === 'bottom'
  
  return (
    <div className="mt-10 pl-2" style={{ paddingBottom: bottomPadding ? `${bottomPadding}px` : '1.25rem' }}>
      <div className={`flex items-center gap-2 mb-4 h-6 ${isBottom ? 'justify-center' : ''}`}>
        <Image src="/logo-dark.png" alt="Refetch Logo" width={96} height={21} className="rounded" style={{ width: '96px', height: '21px' }} />
      </div>
      {/* Short description added here */}
      <div className={`text-xs text-gray-500 mb-2 leading-5 ${isBottom ? 'text-center' : ''}`}>
        Your daily drop of curated tech news - signal over noise. Transparent. Community-driven.
      </div>

      {/* Separator */}
      <div className="h-px bg-gray-200 mb-4 mt-4 opacity-50"></div>

      <div className={`flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4 leading-4 ${isBottom ? 'justify-center' : ''}`}>
        <a href="#" className="hover:text-gray-700">
          About
        </a>
        <span>•</span>
        <a href="#" className="hover:text-gray-700">
          Terms
        </a>
        <span>•</span>
        <a href="#" className="hover:text-gray-700">
          Privacy
        </a>
        <span>•</span>
        <a href="#" className="hover:text-gray-700">
          Security
        </a>
        <span>•</span>
        <a href="#" className="hover:text-gray-700">
          Cookies
        </a>
        <span>•</span>
        <a href="#" className="hover:text-gray-700 bg-gray-200/60 px-2 py-1 rounded-md hover:bg-gray-200/80 transition-colors">
          Donate
        </a>
        <span>•</span>
        <div className="flex items-center gap-1">
          {/* Social icons grouped together */}
          <Twitter className="w-3 h-3 text-gray-900 flex-shrink-0" />
          <Facebook className="w-3 h-3 text-gray-900 flex-shrink-0" />
          <Github className="w-3 h-3 text-gray-900 flex-shrink-0" />
        </div>
        <span>•</span>
        <a href="#" className="hover:text-gray-700">
          Powered by Appwrite
        </a>
      </div>

      {/* Separator */}
      <div className="h-px bg-gray-200 mb-4 mt-2 opacity-50"></div>

      <div className={`text-xs text-gray-500 pb-3 leading-4 ${isBottom ? 'text-center' : ''}`}>
        Copyright © 2025 Refetch
      </div>
    </div>
  )
} 
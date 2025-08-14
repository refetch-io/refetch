"use client"

import Image from "next/image"

interface FooterProps {
  variant?: 'sidebar' | 'bottom'
  bottomPadding?: number
}

export function Footer({ variant = 'sidebar', bottomPadding }: FooterProps) {
  const isBottom = variant === 'bottom'
  
  return (
    <div className="mt-10 pl-2" style={{ paddingBottom: bottomPadding ? `${bottomPadding}px` : '0' }}>
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
        <a href="https://appwrite.io/terms" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">
          Terms
        </a>
        <span>•</span>
        <a href="https://appwrite.io/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">
          Privacy
        </a>
        <span>•</span>
        <a href="https://appwrite.io/docs/advanced/security" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">
          Security
        </a>
        <span>•</span>
        <a href="#" className="hover:text-gray-700 bg-gray-200/60 px-2 py-1 rounded-md hover:bg-gray-200/80 transition-colors">
          Donate
        </a>
        <span>•</span>
        <div className="flex items-center gap-2">
          {/* Social icons grouped together */}
          <a href="#" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4 text-gray-900 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="https://github.com/refetch-io/refetch" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4 text-gray-900 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
        <span>•</span>
        <a href="https://appwrite.io" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">
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
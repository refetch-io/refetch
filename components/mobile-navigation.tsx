"use client"

import { TrendingUp, Clock, BarChart3, Heart, Twitter, Facebook, Github, Monitor, Briefcase, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

interface MobileNavigationProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
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

        {/* Navigation Content */}
        <div className="flex flex-col h-full">
          {/* Navigation Items */}
          <div className="p-4 pb-2 flex-shrink-0">
            <div className="space-y-1">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg cursor-pointer h-10">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm leading-5">Top</span>
                </div>
                <Badge variant="secondary" className="bg-[#4e1cb3] text-white text-xs leading-4 flex-shrink-0">
                  +1k
                </Badge>
              </div>

              <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer h-10">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 leading-5">New</span>
              </div>

              <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer h-10">
                <Monitor className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 leading-5">Show</span>
              </div>

              <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer h-10">
                <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 leading-5">Jobs</span>
              </div>

              <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer h-10">
                <BarChart3 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 leading-5">Rising</span>
              </div>

              <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer h-10">
                <Heart className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 leading-5">Saved</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 pt-2 border-t border-gray-200 flex-1 overflow-y-auto max-h-[550px]  mb-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 h-6 mb-4 mt-6">
                <Image src="/logo-dark.png" alt="Refetch Logo" width={96} height={21} className="rounded" style={{ width: '96px', height: '21px' }} />
              </div>
              
              <div className="text-xs text-gray-500 leading-5">
                Your daily drop of curated tech news - signal over noise. Transparent. Community-driven.
              </div>
            </div>

            <div className="h-px bg-gray-200 opacity-50 my-6"></div>

            <div className="space-y-4">
              <div className="text-xs text-gray-500 leading-4">Copyright © 2025 Refetch</div>

              <div className="flex flex-wrap gap-2 text-xs text-gray-500 leading-4">
                <a href="#" className="hover:text-gray-700">
                  About
                </a>
                <a href="#" className="hover:text-gray-700">
                  Terms
                </a>
                <a href="#" className="hover:text-gray-700">
                  Privacy
                </a>
                <a href="#" className="hover:text-gray-700">
                  Security
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 leading-4">
                <a href="#" className="hover:text-gray-700">
                  Cookies
                </a>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Twitter className="w-3 h-3 text-gray-900 flex-shrink-0" />
                  <Facebook className="w-3 h-3 text-gray-900 flex-shrink-0" />
                  <Github className="w-3 h-3 text-gray-900 flex-shrink-0" />
                </div>
              </div>

              <div className="text-xs text-gray-500 leading-4">Powered by Appwrite Cloud</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 
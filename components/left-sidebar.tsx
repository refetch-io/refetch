"use client"

import { TrendingUp, Clock, BarChart3, Heart, Twitter, Facebook, Github, Monitor, Briefcase } from "lucide-react" // Added Monitor and Briefcase
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"

export function LeftSidebar() {
  return (
    <aside className="hidden lg:block w-full sm:w-56 lg:w-56 sticky top-16 h-fit">
      <div className="pt-4 pr-4 pb-4">
        <div className="space-y-1">
          <Link href="/" passHref>
            <div className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-gray-50 cursor-pointer h-10">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm leading-5">Top</span>
              </div>
              <Badge variant="secondary" className="bg-[#4e1cb3] text-white text-xs leading-4 flex-shrink-0">
                +1k
              </Badge>
            </div>
          </Link>

          <Link href="/" passHref>
            <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer h-10">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600 leading-5">New</span>
            </div>
          </Link>

          {/* Updated Show link with Monitor icon */}
          <Link href="/" passHref>
            <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer h-10">
              <Monitor className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600 leading-5">Show</span>
            </div>
          </Link>

          {/* Updated Jobs link with Briefcase icon */}
          <Link href="/" passHref>
            <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer h-10">
              <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600 leading-5">Jobs</span>
            </div>
          </Link>

          <Link href="/" passHref>
            <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer h-10">
              <BarChart3 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600 leading-5">Rising</span>
            </div>
          </Link>

          <Link href="/" passHref>
            <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer h-10">
              <Heart className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600 leading-5">Saved</span>
            </div>
          </Link>
        </div>
      </div>
      
      {/* Footer positioned below sidebar */}
      <div className="pt-4 pr-4 pb-4 mt-6">
        <div className="flex items-center gap-2 mb-2 h-6">
          <Image src="/logo-dark.png" alt="Refetch Logo" width={96} height={21} className="rounded" style={{ width: '96px', height: '21px' }} />
        </div>
        {/* Short description added here */}
        <div className="text-xs text-gray-500 mb-2 leading-5">
          Your daily drop of curated tech news - signal over noise. Transparent. Community-driven.
        </div>

        {/* Separator */}
        <div className="h-px bg-gray-200 mb-6 mt-6 opacity-50"></div>

        <div className="text-xs text-gray-500 mb-3 leading-4">Copyright © 2025 Refetch</div>

        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3 leading-4">
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

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 leading-4">
          <a href="#" className="hover:text-gray-700">
            Cookies
          </a>
          <span>•</span>
          <div className="flex items-center gap-1">
            {/* Reverted to smaller size, kept dark color for visual density */}
            <Twitter className="w-3 h-3 text-gray-900 flex-shrink-0" />
            <Facebook className="w-3 h-3 text-gray-900 flex-shrink-0" />
            <Github className="w-3 h-3 text-gray-900 flex-shrink-0" />
          </div>
        </div>

        <div className="text-xs text-gray-500 leading-4">Powered by Appwrite Cloud</div>
      </div>
    </aside>
  )
}

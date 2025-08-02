"use client"

import { TrendingUp, Clock, BarChart3, Heart, Twitter, Facebook, Github, Monitor, Briefcase } from "lucide-react" // Added Monitor and Briefcase
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

export function LeftSidebar() {
  return (
    <aside className="w-full sm:w-56 lg:w-56 sticky top-16 h-fit">
      <div className="p-4 mb-7">
        <div className="text-sm font-medium text-gray-600 mb-4">Latest dev news</div>

        <div className="space-y-1">
          <div className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-gray-50 cursor-pointer">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-sm">Top</span>
            </div>
            <Badge variant="secondary" className="bg-[#4e1cb3] text-white text-xs">
              +1k
            </Badge>
          </div>

          <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">New</span>
          </div>

          {/* Updated Show link with Monitor icon */}
          <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
            <Monitor className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Show</span>
          </div>

          {/* Updated Jobs link with Briefcase icon */}
          <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
            <Briefcase className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Jobs</span>
          </div>

          <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Rising</span>
          </div>

          <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
            <Heart className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Saved</span>
          </div>
        </div>
      </div>
      {/* Footer positioned below sidebar */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Image src="/logo-dark.png" alt="Refetch Logo" width={80} height={20} className="rounded" />
        </div>
        {/* Short description added here */}
        <div className="text-xs text-gray-500 mb-4 mt-2">
          Your daily dose of curated tech news, without the noise. We're all about transparency and community-driven
          content.
        </div>

        <div className="text-xs text-gray-500 mb-3">Copyright © 2025 Refetch</div>

        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
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

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <a href="#" className="hover:text-gray-700">
            Cookies
          </a>
          <span>•</span>
          <div className="flex items-center gap-1">
            {/* Reverted to smaller size, kept dark color for visual density */}
            <Twitter className="w-3 h-3 text-gray-900" />
            <Facebook className="w-3 h-3 text-gray-900" />
            <Github className="w-3 h-3 text-gray-900" />
          </div>
        </div>

        <div className="text-xs text-gray-500">Powered by Appwrite Cloud</div>
      </div>
    </aside>
  )
}

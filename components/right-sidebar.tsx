"use client"

import { BarChart3 } from "lucide-react"

export function RightSidebar() {
  const trendingTopics = [
    "AI",
    "Cloud Computing",
    "Web Development",
    "Cybersecurity",
    "Data Science",
    "Open Source",
    "DevOps",
    "Machine Learning",
  ]

  return (
    <div className="space-y-4">
      {/* Site Statistics */}
      <div className="flex gap-1 mb-4">
        <div className="flex-1 flex items-center justify-between p-2 bg-white rounded-lg h-8">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-xs leading-4">24h</span>
          </div>
          <span className="text-xs font-semibold text-gray-900">2.8k</span>
        </div>
        
        <div className="flex-1 flex items-center justify-between p-2 bg-white rounded-lg h-8">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-xs leading-4">30d</span>
          </div>
          <span className="text-xs font-semibold text-gray-900">45k</span>
        </div>
      </div>

      {/* Trending Section */}
      <div className="bg-white rounded-lg pb-4">
        <h3 className="font-normal text-gray-900 mb-2 px-4 pt-4 font-heading">Trending Now</h3>
        {/* Separator between title and first item */}
        <div className="h-px bg-gray-100 my-1" />
        <div className="space-y-0">
          {trendingTopics.map((topic, index) => (
            <div key={topic}>
              <div className="text-sm text-gray-700 py-1 px-4">
                <p className="font-light">#{topic}</p> {/* Added # and font-light to the topic */}
              </div>
              {index < trendingTopics.length - 1 && <div className="h-px bg-gray-100 my-1" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

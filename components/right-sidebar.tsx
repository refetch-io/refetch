"use client"

import { BarChart3 } from "lucide-react"
import { useState, useMemo } from "react"
import { StatsChart } from "@/components/ui/chart"

export function RightSidebar() {
  const [selectedTab, setSelectedTab] = useState("24h")
  
  const trendingTopics = [
    "AI",
    "DataScience",
    "OpenSource",
    "DevOps",
    "MachineLearning",
  ]

  // Sample data for the chart - deterministic to prevent hydration issues
  const chartData = useMemo(() => {
    if (selectedTab === "24h") {
      return Array.from({ length: 24 }, (_, i) => {
        // Create a more realistic pattern with peaks during work hours
        const hour = i
        let baseVisitors = 30
        if (hour >= 9 && hour <= 17) baseVisitors = 60 // Work hours
        if (hour >= 19 && hour <= 22) baseVisitors = 45 // Evening
        if (hour >= 0 && hour <= 6) baseVisitors = 15 // Night
        
        // Use deterministic values based on hour
        const variation = (hour * 7 + 13) % 20 // Deterministic variation
        return {
          hour: i,
          visitors: baseVisitors + variation
        }
      })
    } else {
      return Array.from({ length: 30 }, (_, i) => {
        // Create weekly patterns
        const day = i + 1
        const dayOfWeek = day % 7
        let baseVisitors = 120
        if (dayOfWeek === 0 || dayOfWeek === 6) baseVisitors = 80 // Weekend
        if (dayOfWeek >= 1 && dayOfWeek <= 5) baseVisitors = 150 // Weekday
        
        // Use deterministic values based on day
        const variation = (day * 11 + 17) % 50 // Deterministic variation
        return {
          day: i + 1,
          visitors: baseVisitors + variation
        }
      })
    }
  }, [selectedTab])

  return (
    <div className="space-y-6">
      {/* Chart and Tabs Group */}
      <div className="space-y-1">
        {/* Chart Card */}
        <div className="bg-white rounded-lg p-1">
          <h3 className="font-normal text-gray-900 mb-2 px-1 pt-1 font-heading">Stats</h3>
          <div className="h-px bg-gray-100 mb-2 -mx-1" />
          <div className="text-xs text-gray-600 px-1 py-0.5 font-medium mb-5">
            {selectedTab === "24h" ? "Last 24 Hours" : "Last 30 Days"}
          </div>
          <StatsChart data={chartData} selectedTab={selectedTab} />
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => setSelectedTab("24h")}
            className={`flex-1 flex items-center justify-between p-2 rounded-lg h-8 transition-colors ${
              selectedTab === "24h" 
                ? "bg-white text-gray-900" 
                : "bg-gray-50/50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs leading-4">24h</span>
            </div>
            <span className="text-xs font-semibold">2.8k</span>
          </button>
          
          <button
            onClick={() => setSelectedTab("30d")}
            className={`flex-1 flex items-center justify-between p-2 rounded-lg h-8 transition-colors ${
              selectedTab === "30d" 
                ? "bg-white text-gray-900" 
                : "bg-gray-50/50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3 h-3 flex-shrink-0" />
              <span className="text-xs leading-4">30d</span>
            </div>
            <span className="text-xs font-semibold">45k</span>
          </button>
        </div>
      </div>

      {/* Trending Section */}
      <div className="bg-white rounded-lg pb-2">
        <h3 className="font-normal text-gray-900 mb-2 px-4 pt-2 font-heading">Trending Now</h3>
        {/* Separator between title and first item */}
        <div className="h-px bg-gray-100 my-1" />
        <div className="space-y-0">
          {trendingTopics.map((topic, index) => (
            <div key={topic}>
                          <div className="text-sm text-gray-700 py-1 px-4">
              <p className="font-light"># {topic}</p> {/* Added # and font-light to the topic */}
            </div>
              {index < trendingTopics.length - 1 && <div className="h-px bg-gray-100 my-1" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

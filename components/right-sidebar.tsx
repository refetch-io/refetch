"use client"

import { BarChart3 } from "lucide-react"
import { useState, useMemo, useEffect } from "react"
import { StatsChart } from "@/components/ui/chart"

// Live View Card Component
function LiveViewCard() {
  const [onlineUsers, setOnlineUsers] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch real-time visitors from analytics API
  const fetchRealtimeVisitors = async () => {
    try {
      const response = await fetch('/api/plausible/realtime?type=realtime')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setOnlineUsers(data.data)
        setError(null)
      }
    } catch (err) {
      console.error('Failed to fetch real-time visitors:', err)
      setError('Failed to fetch live data')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch initial data and set up polling
  useEffect(() => {
    // Fetch immediately
    fetchRealtimeVisitors()
    
    // Set up polling every 30 seconds (as per real-time dashboard)
    const interval = setInterval(fetchRealtimeVisitors, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-white rounded-lg px-4 py-2 min-h-[80px]">
      <h3 className="font-normal text-gray-900 mb-3 font-heading text-sm">
        {isLoading ? (
          <div className="w-32 h-8"></div>
        ) : error ? (
          <div className="w-full h-8 flex items-center justify-center">
            <span className="bg-gray-100/80 px-2 py-1 rounded-md text-xs text-gray-600">Error loading data</span>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <span className="text-2xl font-semibold">{onlineUsers}</span> refetchers online
          </div>
        )}
      </h3>
      <div className="h-px bg-gray-100 mb-2 -mx-4" />
      <div className="text-xs text-gray-600 font-medium h-4">
        {isLoading ? 'Connecting to live data...' : 
         error ? '' : 
         <span>Live • <span className="text-gray-500/80">Updated a few seconds ago</span></span>}
      </div>
    </div>
  )
}

// Chart Card Component
function ChartCard() {
  const [selectedTab, setSelectedTab] = useState("24h")
  const [chartData, setChartData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch chart data from analytics API
  const fetchChartData = async (dataType: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/plausible/realtime?type=${dataType}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setChartData(data.data)
        setError(null)
      }
    } catch (err) {
      console.error(`Failed to fetch ${dataType} data:`, err)
      setError('Failed to fetch chart data')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch data when tab changes
  useEffect(() => {
    fetchChartData(selectedTab)
  }, [selectedTab])

  // Transform data for chart display
  const transformedChartData = useMemo(() => {
    if (selectedTab === "24h") {
      return chartData.map(d => ({
        hour: d.hour !== undefined ? d.hour : parseInt(d.date?.split(':')[0]) || 0,
        visitors: d.visitors
      }))
    } else {
      return chartData.map(d => ({
        day: d.day !== undefined ? d.day : parseInt(d.date) || 0,
        visitors: d.visitors
      }))
    }
  }, [chartData, selectedTab])

  return (
    <div className="space-y-1">
      {/* Chart Card */}
      <div className="bg-white rounded-lg px-4 py-2 min-h-[120px]">
        <div className="text-xs text-gray-600 font-medium mb-5">
          {selectedTab === "24h" ? "Last 24 Hours" : "Last 30 Days"}
        </div>
        {isLoading ? (
          <div className="h-20 rounded animate-pulse"></div>
        ) : error ? (
          <div className="h-20 flex items-center justify-center">
            <div className="bg-gray-100/80 px-2 py-1 rounded-md text-xs text-gray-600">
              {error}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <StatsChart data={transformedChartData} selectedTab={selectedTab} />
          </div>
        )}
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
  )
}

// Trending Topics Card Component
function TrendingTopicsCard() {
  const trendingTopics = [
    "AI",
    "DataScience",
    "OpenSource",
    "DevOps",
    "MachineLearning",
  ]

  return (
    <div className="bg-white rounded-lg pb-2">
      <h3 className="font-normal text-gray-900 mb-2 px-4 pt-2 font-heading text-sm">Trending Now</h3>
      {/* Separator between title and first item */}
      <div className="h-px bg-gray-100 my-1" />
      <div className="space-y-0">
        {trendingTopics.map((topic, index) => (
          <div key={topic}>
            <div className="text-sm text-gray-700 py-1 px-4">
              <p># {topic}</p> {/* Added # to the topic */}
            </div>
            {index < trendingTopics.length - 1 && <div className="h-px bg-gray-100 my-1" />}
          </div>
        ))}
      </div>
    </div>
  )
}

export function RightSidebar() {
  return (
    <div className="space-y-6">
      {/* Live View Card */}
      <LiveViewCard />

      {/* Chart and Tabs Group */}
      <ChartCard />

      {/* Trending Section */}
      <TrendingTopicsCard />
    </div>
  )
}

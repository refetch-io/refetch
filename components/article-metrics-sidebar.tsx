"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Eye, MessageCircle, ThumbsUp, Share2, Clock, BarChart } from "lucide-react"

interface ArticleMetricsSidebarProps {
  score: number
  commentsCount: number
}

export function ArticleMetricsSidebar({ score, commentsCount }: ArticleMetricsSidebarProps) {
  // Dummy metrics for demonstration
  const totalViews = (score * 10 + Math.floor(Math.random() * 500)).toLocaleString()
  const upvoteRatio = `${Math.min(100, 80 + Math.floor(Math.random() * 20))}%`
  const engagementScore = (score * 0.5 + commentsCount * 2 + Math.floor(Math.random() * 10)).toFixed(1)
  const trendingRank = Math.floor(Math.random() * 50) + 1
  const averageReadTime = `${Math.floor(Math.random() * 5) + 3} min` // 3-7 minutes

  return (
    <aside className="w-full sm:w-64 lg:w-64 sticky top-16 h-fit">
      <Card className="bg-white border-none shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold font-heading">Article Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-500" />
              <span>Total Views:</span>
            </div>
            <span className="font-medium text-gray-900">{totalViews}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-gray-500" />
              <span>Total Score:</span>
            </div>
            <span className="font-medium text-gray-900">{score}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-gray-500" />
              <span>Comments:</span>
            </div>
            <span className="font-medium text-gray-900">{commentsCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span>Upvote Ratio:</span>
            </div>
            <span className="font-medium text-gray-900">{upvoteRatio}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-gray-500" />
              <span>Engagement Score:</span>
            </div>
            <span className="font-medium text-gray-900">{engagementScore}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>Avg. Read Time:</span>
            </div>
            <span className="font-medium text-gray-900">{averageReadTime}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart className="w-4 h-4 text-gray-500" />
              <span>Trending Rank:</span>
            </div>
            <span className="font-medium text-gray-900">#{trendingRank}</span>
          </div>
        </CardContent>
      </Card>
    </aside>
  )
}

"use client"

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ChartData {
  hour?: number
  day?: number
  month?: string
  visitors: number
}

interface StatsChartProps {
  data: ChartData[]
  selectedTab: string
}

export function StatsChart({ data, selectedTab }: StatsChartProps) {
  // Check if data is empty or undefined
  if (!data || data.length === 0) {
    return (
      <div className="h-16 overflow-hidden -mx-2 rounded-lg flex items-center justify-center">
        <div className="text-gray-400 text-xs">No data available</div>
      </div>
    )
  }

  // For 24h data, create rolling time labels based on current time
  const getTimeLabels = () => {
    if (selectedTab === "24h" && data.length > 0) {
      const now = new Date()
      const currentHour = now.getHours()
      
      // Create labels for the last 24 hours ending at current time
      // Position 0 should be 24 hours ago, position 23 should be current hour
      const labels = data.map((_, i) => {
        const hour = (currentHour - (23 - i) + 24) % 24
        return `${hour.toString().padStart(2, '0')}:00`
      })
      
      return labels
    }
    
    // For other tabs, use the original logic
    return data.map(d => {
      if (selectedTab === "30d") return `Day ${d.day}`
      if (selectedTab === "1y") return d.month
      return `Day ${d.day}`
    })
  }

  const labels = getTimeLabels()
  const values = data.map(d => d.visitors)

  // Get current time for 24h chart context
  const getCurrentTimeRange = () => {
    if (selectedTab === "24h" && data.length > 0) {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const startHour = (currentHour - 23 + 24) % 24
      return `${startHour.toString().padStart(2, '0')}:00 - ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
    }
    return null
  }

  const currentTimeRange = getCurrentTimeRange()

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Visitors',
        data: values,
        borderColor: '#4e1cb3',
        backgroundColor: '#faf5ff',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#4e1cb3',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#4e1cb3',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#4e1cb3',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function(context: any) {
            return context[0].label
          },
          label: function(context: any) {
            return `${context.parsed.y} visitors`
          }
        }
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    elements: {
      point: {
        radius: 0,
      },
    },
  }

  return (
    <div className="h-16 overflow-hidden -mx-2 rounded-lg">
      <Line data={chartData} options={options} />
      {currentTimeRange && (
        <div className="text-xs text-gray-400 text-center mt-1">
          {currentTimeRange}
        </div>
      )}
    </div>
  )
}

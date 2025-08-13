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

  const labels = data.map(d => {
    if (selectedTab === "24h") return `${d.hour}:00`
    if (selectedTab === "30d") return `Day ${d.day}`
    if (selectedTab === "1y") return d.month
    return `Day ${d.day}`
  })
  const values = data.map(d => d.visitors)

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
    </div>
  )
}

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
  visitors: number
}

interface StatsChartProps {
  data: ChartData[]
  selectedTab: string
}

export function StatsChart({ data, selectedTab }: StatsChartProps) {
  const labels = data.map(d => selectedTab === "24h" ? `${d.hour}:00` : `Day ${d.day}`)
  const values = data.map(d => d.visitors)

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Visitors',
        data: values,
        borderColor: '#4e1cb3',
        backgroundColor: 'rgba(78, 28, 179, 0.1)',
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
    <div className="h-20 w-full rounded-lg overflow-hidden">
      <Line data={chartData} options={options} />
    </div>
  )
}

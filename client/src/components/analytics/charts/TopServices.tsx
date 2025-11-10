"use client"

import { Pie, PieChart } from "recharts"
import { useEffect, useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { getTopServices, ITopService } from "@/utils/api/getTopServices"
import { Star } from "lucide-react"

export const description = "A simple pie chart"

// Helper function to format date
const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const chartConfig = {
  service: {
    label: "Service",
  },
  service1: {
    label: "Service 1",
    color: "#FF2056",
  },
  service2: {
    label: "Service 2", 
    color: "#FACC15",
  },
  service3: {
    label: "Service 3",
    color: "#FB923C",
  },
  colorRenewal: {
    label: "Color Renewal",
    color: "#8B5CF6",
  },
} satisfies ChartConfig

interface TopServicesProps {
  selectedBranches?: string[]
}

export function TopServices({ selectedBranches = [] }: TopServicesProps) {
  const [chartData, setChartData] = useState<ITopService[]>([])
  const [dateRange, setDateRange] = useState<{earliest: string | null, latest: string | null, totalLineItems: number} | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const RADIAN = Math.PI / 180

  const getTextColor = (hex?: string) => {
    if (!hex) return "#0f172a"
    const normalized = hex.replace("#", "")
    if (normalized.length !== 6) return "#0f172a"
    const r = parseInt(normalized.slice(0, 2), 16)
    const g = parseInt(normalized.slice(2, 4), 16)
    const b = parseInt(normalized.slice(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.6 ? "#0f172a" : "#fafafa"
  }

  const formatPercent = (value: number) => {
    if (value >= 0.1) return `${Math.round(value * 100)}%`
    if (value >= 0.01) return `${(value * 100).toFixed(1)}%`
    return `<0.1%`
  }

  const truncateLabel = (label: string, maxLength = 18) =>
    label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label

  const renderSliceLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    payload,
  }: {
    cx: number
    cy: number
    midAngle: number
    innerRadius: number
    outerRadius: number
    percent: number
    payload: ITopService
  }) => {
    if (percent < 0.03) return null // skip tiny slices
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    const label = truncateLabel(payload.service)
    const percentText = formatPercent(percent)
    const textColor = getTextColor(payload.fill)

    return (
      <text
        x={x}
        y={y}
        fill={textColor}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontWeight={600}
      >
        <tspan x={x} y={y - 6} fontSize={11} fontWeight={600}>
          {label}
        </tspan>
        <tspan x={x} y={y + 6} fontSize={10} fontWeight={500}>
          {percentText}
        </tspan>
      </text>
    )
  }

  useEffect(() => {
    const fetchTopServices = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await getTopServices(selectedBranches)
        
        if (!response || !response.data || !Array.isArray(response.data)) {
          setError('Invalid data format')
          setChartData([])
          setDateRange(null)
          return
        }
        
        setChartData(response.data)
        setDateRange(response.dateRange)
      } catch (err) {
        console.error("Error fetching top services:", err)
        setError("Failed to load top services data")
        setChartData([])
        setDateRange(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTopServices()
  }, [selectedBranches])

  if (loading) {
    return (
      <Card className="flex min-h-[140px]" style={{ width: "100%" }}>
        <CardHeader className="items-left pb-0">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            <h3>Top Services</h3>
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex justify-center items-center pb-0">
          <div>Loading chart data...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="flex min-h-[140px]" style={{ width: "100%" }}>
        <CardHeader className="items-left pb-0">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            <h3>Top Services</h3>
          </CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex justify-center items-center pb-0">
          <div className="text-red-500">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col" style={{ width: "100%" }}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="h-5 w-5" />
          <h2 className="font-semibold">Top Services</h2>
        </CardTitle>
        <CardDescription className="text-sm text-gray-600">
          {selectedBranches.length === 0 || selectedBranches.includes('total')
            ? "Service usage across all branches"
            : `Service usage - ${selectedBranches.length} branch${selectedBranches.length > 1 ? 'es' : ''}`}
        </CardDescription>
        {dateRange && dateRange.earliest && dateRange.latest && (
          <div className="text-xs text-gray-500 mt-1">
            {formatDate(dateRange.earliest)} - {formatDate(dateRange.latest)}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex justify-center items-center pt-0">
        <ChartContainer config={chartConfig} className="w-[300px] h-[280px]">
          <PieChart width={280} height={280}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="transactions"
              nameKey="service"
              innerRadius={0}
              outerRadius={120}
              labelLine={false}
              label={renderSliceLabel}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

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
    <Card className="flex min-h-[180px]" style={{ width: "100%" }}>
      <div className="flex-1 flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-5 w-5" />
            <h2 className="font-semibold">Top Services</h2>
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
            {selectedBranches.length === 0 || selectedBranches.includes("4") 
              ? "Service usage across all branches" 
              : `Service usage - ${selectedBranches.length} branch${selectedBranches.length > 1 ? 'es' : ''}`}
          </CardDescription>
          {dateRange && dateRange.earliest && dateRange.latest && (
            <div className="text-xs text-gray-500 mt-1">
              {formatDate(dateRange.earliest)} - {formatDate(dateRange.latest)}
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 pt-0">
          <div className="space-y-2">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: item.fill }}
                  ></div>
                  <span className="text-sm font-medium text-gray-700 truncate">{item.service}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{item.transactions}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </div>
      <div className="w-[200px] flex items-center justify-center p-2">
        <ChartContainer
          config={chartConfig}
          className="w-full h-[160px]"
        >
          <PieChart width={160} height={160}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie 
              data={chartData} 
              dataKey="transactions" 
              nameKey="service" 
              outerRadius={70}
            />
          </PieChart>
        </ChartContainer>
      </div>
    </Card>
  )
}

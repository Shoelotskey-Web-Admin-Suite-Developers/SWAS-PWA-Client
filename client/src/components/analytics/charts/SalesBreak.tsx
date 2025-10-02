"use client"

import * as React from "react"
import { Pie, PieChart, Label } from "recharts"
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
import { getSalesBreakdown, ISalesBreakdown } from "@/utils/api/getSalesBreakdown"
import { PieChart as PieChartIcon } from "lucide-react"

export const description = "A donut chart with text"

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

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
  transactions: {
    label: "Transactions",
  },
  up: {
    label: "Unpaid",
    color: "var(--chart-1)",
  },
  pp: {
    label: "Partially Paid",
    color: "var(--chart-2)",
  },
  p: {
    label: "Paid",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

interface SalesBreakdownProps {
  selectedBranches?: string[]
}

export function SalesBreakdown({ selectedBranches = [] }: SalesBreakdownProps) {
  const [chartData, setChartData] = useState<ISalesBreakdown[]>([])
  const [dateRange, setDateRange] = useState<{earliest: string | null, latest: string | null, totalTransactions: number} | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSalesBreakdown = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await getSalesBreakdown(selectedBranches)
        setChartData(response.data)
        setDateRange(response.dateRange)
      } catch (err) {
        console.error("Error fetching sales breakdown:", err)
        setError("Failed to load sales breakdown data")
        setChartData([])
        setDateRange(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSalesBreakdown()
  }, [selectedBranches])

  const totalTransactions = React.useMemo(() => {
    return chartData.reduce((acc: number, curr: ISalesBreakdown) => acc + curr.transactions, 0)
  }, [chartData])



  if (loading) {
    return (
      <Card className="flex min-h-[140px]" style={{ width: "100%" }}>
        <CardHeader className="items-left pb-0">
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            <h3>Sales Breakdown</h3>
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
            <PieChartIcon className="h-5 w-5" />
            <h3>Sales Breakdown</h3>
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
            <PieChartIcon className="h-5 w-5" />
            <h2 className="font-semibold">Sales Breakdown</h2>
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
            {selectedBranches.length === 0 || selectedBranches.includes("4") 
              ? "Payment status across all branches" 
              : `Payment status - ${selectedBranches.length} branch${selectedBranches.length > 1 ? 'es' : ''}`}
          </CardDescription>
          {dateRange && dateRange.earliest && dateRange.latest && (
            <div className="text-xs text-gray-500 mt-1">
              {formatDate(dateRange.earliest)} - {formatDate(dateRange.latest)}
              <span className="block">
                {dateRange.totalTransactions} transaction{dateRange.totalTransactions !== 1 ? 's' : ''}
              </span>
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
                  <span className="text-sm font-medium text-gray-700">{item.status}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{item.transactions}</div>
                  <div className="text-xs text-gray-500">{formatCurrency(item.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </div>
      <div className="w-[200px] flex items-center justify-center p-2">
        <ChartContainer config={chartConfig} className="w-full h-[160px]">
          <PieChart width={160} height={160}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="transactions"
              nameKey="status"
              innerRadius={35}
              outerRadius={70}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 6}
                          className="fill-foreground text-xs font-bold"
                        >
                          {totalTransactions.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 6}
                          className="fill-muted-foreground text-[8px]"
                        >
                          Total
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>
    </Card>
  )
}

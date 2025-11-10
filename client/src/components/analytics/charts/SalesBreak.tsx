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

  const truncateLabel = (label: string, maxLength = 16) =>
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
    payload: ISalesBreakdown
  }) => {
    if (percent < 0.04) return null

    const radius = innerRadius + (outerRadius - innerRadius) * 0.55
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    const label = truncateLabel(payload.status)
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
    <Card className="flex flex-col" style={{ width: "100%" }}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChartIcon className="h-5 w-5" />
          <h2 className="font-semibold">Sales Breakdown</h2>
        </CardTitle>
        <CardDescription className="text-sm text-gray-600">
          {selectedBranches.length === 0 || selectedBranches.includes('total')
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
      <CardContent className="flex justify-center items-center pt-0">
        <ChartContainer config={chartConfig} className="w-[300px] h-[280px]">
          <PieChart width={280} height={280}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="transactions"
              nameKey="status"
              innerRadius={65}
              outerRadius={125}
              labelLine={false}
              label={renderSliceLabel}
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
      </CardContent>
    </Card>
  )
}

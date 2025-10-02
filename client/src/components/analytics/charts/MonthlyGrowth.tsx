"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart"
import { format } from "date-fns"
import { useEffect, useState } from "react"
// Dynamic monthly revenue util
import { getMonthlyRevenueDynamic } from "@/utils/api/getMonthlyRevenueDynamic"
import { BranchMeta } from "@/utils/analytics/branchMeta"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export const description = "Multiple bar chart for branch sales"

interface ChartBarMultipleProps { selectedBranches: string[]; branchMeta: BranchMeta[] }

interface EnhancedMonthlyData {
  month: string;
  total: number;
  // dynamic branch keys will be added
  [key: string]: any;
}

// chartConfig & branchMap will be built at runtime using branchMeta

export function MonthlyGrowthRate({ selectedBranches, branchMeta }: ChartBarMultipleProps) {
  const [data, setData] = useState<EnhancedMonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Build dynamic chart config (include synthetic total from meta) and branch map
  const totalMeta = branchMeta.find(m => m.branch_id === 'TOTAL')
  const dynamicChartConfig: Record<string, { label: string; color: string }> = {}
  dynamicChartConfig.total = { label: totalMeta?.branch_name || 'Total of Branches', color: '#CE1616' }
  branchMeta.filter(m => m.branch_id !== 'TOTAL').forEach(m => { dynamicChartConfig[m.dataKey] = { label: m.branch_name, color: m.color } })
  const branchMap: Record<string,string> = {
    ...(totalMeta ? { [totalMeta.numericId]: 'total' } : {}),
  }
  branchMeta.filter(m=> m.branch_id !== 'TOTAL').forEach(m => { branchMap[m.numericId] = m.dataKey })

  // Helper to get current month string
  const getCurrentMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  // Function to calculate growth rates
  const calculateGrowthRates = (rows: EnhancedMonthlyData[]): EnhancedMonthlyData[] => {
    return rows.map((curr, idx) => {
      if (idx === 0) {
        return { ...curr, totalGrowth: 0, ...branchMeta.reduce((acc,m)=>{ if(m.branch_id!=='TOTAL') acc[m.dataKey+"Growth"]=0; return acc}, {} as Record<string,number>) }
      }
      const prev = rows[idx-1]
      const calc = (c:number,p:number)=> p===0 ? (c>0?100:0) : ((c-p)/p)*100
      const growths: Record<string,number> = { totalGrowth: calc(curr.total, prev.total) }
      branchMeta.filter(m=> m.branch_id!=='TOTAL').forEach(m => { growths[m.dataKey+"Growth"] = calc(curr[m.dataKey]||0, prev[m.dataKey]||0) })
      return { ...curr, ...growths }
    })
  }

  useEffect(() => {
    if (!branchMeta || branchMeta.length === 0) return; // wait for meta
    let cancelled = false;
    (async () => {
      try {
        setLoading(true)
        setError(null)
        const monthlyData = await getMonthlyRevenueDynamic(branchMeta)
        const withGrowth = calculateGrowthRates(monthlyData as any)
        if (!cancelled) setData(withGrowth)
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching monthly revenue:", err)
          setError(err instanceof Error ? err.message : "Failed to fetch monthly revenue")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })();
    return () => { cancelled = true }
  }, [branchMeta])

  // Apply filtering to loaded data
  const filteredData = data.map(row => {
    if (selectedBranches.length === 0) return row
    const out: any = { month: row.month }
    if (selectedBranches.some(id => branchMap[id] === 'total')) out.total = row.total
    branchMeta.filter(m=> m.branch_id !== 'TOTAL').forEach(m => {
      if (selectedBranches.includes(m.numericId)) out[m.dataKey] = row[m.dataKey]
    })
    // include growth keys
    Object.keys(row).filter(k=> k.endsWith('Growth')).forEach(k=> { out[k]= row[k] })
    return out
  })
  


  const barsToRender = selectedBranches.length > 0
    ? selectedBranches.map(id => branchMap[id]).filter(Boolean)
    : ['total', ...branchMeta.filter(m=> m.branch_id !== 'TOTAL').map(m=> m.dataKey)]

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <h4 className="font-semibold mb-3 text-gray-900">
            {format(new Date(label + "-01"), "MMMM yyyy")}
          </h4>
          {payload.map((entry: any, index: number) => {
            const branchKey = entry.dataKey as string
            const growthKey = `${branchKey}Growth`
            const config = (dynamicChartConfig as any)[branchKey]
            const revenue = entry.value
            const growth = entry.payload[growthKey] || 0
            
            if (revenue === null || revenue === undefined) return null
            
            // Check if this is current month (might have partial/daily updated data)
            const currentMonth = getCurrentMonth()
            const isCurrentMonth = label === currentMonth
            const isZeroRevenue = revenue === 0 && !isCurrentMonth

            const GrowthIcon = growth > 0 ? TrendingUp : growth < 0 ? TrendingDown : Minus
            const growthColor = growth > 0 ? "text-green-600" : growth < 0 ? "text-red-600" : "text-gray-500"
            
            return (
              <div key={index} className="flex items-center justify-between mb-2 min-w-[280px]">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: config?.color || "#000000" }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {config?.label || branchKey}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {isZeroRevenue ? "No Data" : `₱${(revenue / 1000).toFixed(1)}K`}
                    {isCurrentMonth && revenue === 0 && (
                      <span className="text-xs text-orange-600 block">Updating Daily</span>
                    )}
                  </div>
                  {(!isZeroRevenue || (isCurrentMonth && revenue > 0)) && (
                    <div className={`flex items-center gap-1 text-xs ${growthColor}`}>
                      <GrowthIcon size={12} />
                      <span>{growth >= 0 ? '+' : ''}{growth.toFixed(1)}%</span>
                      {isCurrentMonth && <span className="text-orange-600">*</span>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card className="rounded-3xl flex-[1_1_70%]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <h2>Monthly Growth Rate</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[210px]">
            <p>Loading monthly revenue data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="rounded-3xl flex-[1_1_70%]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <h3>Monthly Growth Rate</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[210px]">
            <p className="text-red-500">Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-3xl flex-[1_1_70%]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <h3>Monthly Growth Rate</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
  <ChartContainer config={dynamicChartConfig} style={{ width: "100%", height: "210px" }}>
          <BarChart accessibilityLayer data={filteredData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <YAxis
              tickCount={5}
              width={60}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`}
              label={{
                value: "Revenue (₱)",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fill: "var(--foreground)", fontSize: 14 }
              }}
            />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => format(new Date(value + "-01"), "MMM")}
            />
            <ChartTooltip
              cursor={false}
              content={<CustomTooltip />}
            />
            {barsToRender.map((key) => (
              <Bar
                key={key as string}
                dataKey={key as string}
                fill={(dynamicChartConfig as any)[key]?.color || "#000000"}
                radius={4}
              />
            ))}
          </BarChart>
        </ChartContainer>

        {/* Growth Summary Section */}
        {(() => {
          if (filteredData.length === 0) return null;
          const currentMonth = getCurrentMonth();

          // Helper: does row have any positive revenue among displayed bars (including total)?
          const rowHasAnyData = (row: any) => {
            return barsToRender.some(k => (row[k] ?? 0) > 0) || (row.total ?? 0) > 0;
          };

            // Reverse search for latest month with data; if current month empty, skip it.
          const latestMeaningfulData = [...(filteredData as any)].reverse().find(row => {
            if (row.month > currentMonth) return false; // future
            if (row.month === currentMonth) return rowHasAnyData(row); // accept only if has data
            return rowHasAnyData(row); // prior months must have data
          });

          if (!latestMeaningfulData) return null;

          const isCurrentMonth = latestMeaningfulData.month === currentMonth;
          const currentMonthPartial = isCurrentMonth && rowHasAnyData(latestMeaningfulData);
          const monthLabel = format(new Date(latestMeaningfulData.month + '-01'), 'MMM yyyy');

          return (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Latest Growth Trends
                <span className="text-xs font-normal text-gray-500 ml-1">
                  ({monthLabel}{isCurrentMonth && currentMonthPartial ? ' - Live Data' : ''})
                </span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {barsToRender.map(key => {
                  const latestData = latestMeaningfulData;
                  const growthKey = `${key}Growth`;
                  const growth = (latestData as any)[growthKey] || 0;
                  const revenue = (latestData as any)[key];
                  const config = (dynamicChartConfig as any)[key];
                  if (revenue == null) return null;
                  const isCurrentMonthData = isCurrentMonth;
                  const GrowthIcon = growth > 0 ? TrendingUp : growth < 0 ? TrendingDown : Minus;
                  const growthColor = growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-gray-500';
                  const bgColor = growth > 0 ? 'bg-green-50' : growth < 0 ? 'bg-red-50' : 'bg-gray-50';
                  const showUpdating = isCurrentMonthData && revenue === 0 && currentMonthPartial;
                  return (
                    <div key={key as string} className={`p-2 rounded ${bgColor} border`}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config?.color || '#000000' }} />
                        <span className="text-xs font-medium text-gray-600 truncate">
                          {config?.label?.replace('SM Total of Branches', 'Total') || key}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-800 font-semibold">
                          ₱{(revenue / 1000).toFixed(1)}K
                          {showUpdating && <span className="block text-orange-600 font-normal">Updating...</span>}
                        </span>
                        {(!showUpdating) && (
                          <div className={`flex items-center gap-1 ${growthColor}`}>
                            <GrowthIcon size={10} />
                            <span className="text-xs font-medium">
                              {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                              {isCurrentMonthData && currentMonthPartial && <span className="text-orange-600">*</span>}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  )
}

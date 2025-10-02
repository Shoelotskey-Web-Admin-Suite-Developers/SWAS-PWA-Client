"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Calendar, BarChart3, Download, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

export type AnalyticsView = "revenue" | "forecast" | "growth" | "calendar"

interface ViewToggleProps {
  currentView: AnalyticsView
  onViewChange: (view: AnalyticsView) => void
  onExport?: () => void
  onRefresh?: () => void
  className?: string
}

const viewOptions = [
  {
    value: "revenue" as const,
    label: "Revenue",
    icon: TrendingUp,
    description: "View revenue trends and metrics",
  },
  {
    value: "forecast" as const,
    label: "Forecast",
    icon: BarChart3,
    description: "See forecasted revenue projections",
  },
  {
    value: "growth" as const,
    label: "Growth",
    icon: TrendingUp,
    description: "Analyze growth rates and trends",
  },
  {
    value: "calendar" as const,
    label: "Calendar",
    icon: Calendar,
    description: "View daily revenue in calendar format",
  },
]

export function ViewToggle({
  currentView,
  onViewChange,
  onExport,
  onRefresh,
  className,
}: ViewToggleProps) {
  return (
    <Card className={cn("rounded-3xl", className)}>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* View Toggle Buttons */}
          <div className="flex flex-wrap gap-2">
            {viewOptions.map((option) => {
              const Icon = option.icon
              return (
                <Button
                  key={option.value}
                  variant={currentView === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onViewChange(option.value)}
                  className={cn(
                    "flex items-center gap-2",
                    currentView === option.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{option.label}</span>
                </Button>
              )
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            )}
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}
          </div>
        </div>

        {/* View Description */}
        <div className="mt-2">
          <p className="text-sm text-muted-foreground">
            {viewOptions.find(option => option.value === currentView)?.description}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
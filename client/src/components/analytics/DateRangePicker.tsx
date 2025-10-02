"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateRangePickerProps {
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
  className?: string
}

const presetRanges = [
  {
    label: "Last 7 days",
    value: "7d",
    getDateRange: () => ({
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      to: new Date(),
    }),
  },
  {
    label: "Last 14 days", 
    value: "14d",
    getDateRange: () => ({
      from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      to: new Date(),
    }),
  },
  {
    label: "Last 30 days",
    value: "30d", 
    getDateRange: () => ({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
    }),
  },
  {
    label: "This month",
    value: "month",
    getDateRange: () => {
      const now = new Date()
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      }
    },
  },
  {
    label: "Last month",
    value: "lastMonth",
    getDateRange: () => {
      const now = new Date()
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
      }
    },
  },
]

export function DateRangePicker({
  date,
  setDate,
  className,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<string>("")

  const handlePresetSelect = (presetValue: string) => {
    const preset = presetRanges.find(p => p.value === presetValue)
    if (preset) {
      setDate(preset.getDateRange())
      setSelectedPreset(presetValue)
    }
  }

  const handleCustomDateSelect = (newDate: DateRange | undefined) => {
    setDate(newDate)
    setSelectedPreset("") // Clear preset selection when custom date is selected
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex gap-2">
        {/* Preset Selector */}
        <Select value={selectedPreset} onValueChange={handlePresetSelect}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Quick select" />
          </SelectTrigger>
          <SelectContent>
            {presetRanges.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleCustomDateSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
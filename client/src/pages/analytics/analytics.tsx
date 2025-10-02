import '@/styles/analytics.css'
import { DailyRevenueTrend } from "@/components/analytics/charts/DailyRev"
import { SalesOverTime } from "@/components/analytics/charts/SalesOv"
import { MonthlyGrowthRate } from '@/components/analytics/charts/MonthlyGrowth'
import { TopServices } from '@/components/analytics/charts/TopServices'
import { SalesBreakdown } from '@/components/analytics/charts/SalesBreak'
import { TopCustomers } from '@/components/analytics/charts/TopCust'

import { ExportButton } from '@/components/analytics/ExportButton'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useState, useEffect } from 'react'
import { getBranches } from '@/utils/api/getBranches'
import { buildBranchMeta, buildTotalMeta, BranchMeta } from '@/utils/analytics/branchMeta'
import { getBranchType } from '@/utils/api/getBranchType'
// shadcn components
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Check, ChevronsUpDown, Building } from "lucide-react"
import { cn } from "@/lib/utils"

// branchOptions will be loaded from the API on mount

function Analytics() {
  const [branchOpen, setBranchOpen] = useState(false)
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  const [branchOptions, setBranchOptions] = useState<{ value: string; label: string; color?: string }[]>([])
  const [branchMeta, setBranchMeta] = useState<BranchMeta[]>([])
  const [isAdminBranch, setIsAdminBranch] = useState(false)
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null)
  const [branchIdToNumericMap, setBranchIdToNumericMap] = useState<Record<string, string>>({})

  useEffect(() => {
    let mounted = true
    
    // Get current branch ID from sessionStorage
    const branchId = sessionStorage.getItem("branch_id")
    setCurrentBranchId(branchId)
    
    async function checkBranchType() {
      try {
        const branchType = await getBranchType()
        if (!mounted) return
        setIsAdminBranch(branchType === "A")
      } catch (err) {
        console.error("Failed to get branch type", err)
        setIsAdminBranch(false)
      }
    }

    async function loadBranches() {
      try {
        const data = await getBranches()
        if (!mounted) return
        const filtered = data.filter((b: any) => b.type === 'B')
        const meta = buildBranchMeta(filtered)
  const totalMeta = buildTotalMeta()
        const fullMeta = [...meta, totalMeta]
        setBranchMeta(fullMeta)
  const options = fullMeta.map(m => ({ value: m.numericId, label: m.branch_name, color: m.color }))
        setBranchOptions(options)
        const reverse: Record<string,string> = {}
        meta.forEach(m => { reverse[m.branch_id] = m.numericId })
        setBranchIdToNumericMap(reverse)
      } catch (err) {
        // If fetching fails, fallback to an empty list with only Total option
        setBranchOptions([{ value: "1", label: "Total of Branches" }])
        console.error("Failed to load branches", err)
      }
    }

    checkBranchType()
    loadBranches()
    return () => {
      mounted = false
    }
  }, [])

  // Auto-select branch for non-admin users
  useEffect(() => {
    if (!isAdminBranch && currentBranchId && Object.keys(branchIdToNumericMap).length > 0) {
      const numericId = branchIdToNumericMap[currentBranchId]
      if (numericId) {
        setSelectedBranches([numericId])
      }
    }
  }, [isAdminBranch, currentBranchId, branchIdToNumericMap])



  const toggleBranch = (value: string) => {
    setSelectedBranches((prev) => {
      // Find the "Total of Branches" option dynamically
      const totalOption = branchOptions.find(option => option.label === "Total of Branches");
      const totalValue = totalOption?.value || "1"; // fallback if not found
      
      if (value === totalValue) {
        // If "Total of Branches" is clicked, deselect others
        return prev.includes(totalValue) ? [] : [totalValue];
      } else {
        // If any other branch is clicked, remove "Total"
        const newSelection = prev.includes(value)
          ? prev.filter((v) => v !== value)
          : [...prev.filter((v) => v !== totalValue), value];
        return newSelection;
      }
    });
  };

  // For non-admin branches, filter to show only their branch data
  const effectiveSelectedBranches = isAdminBranch
    ? selectedBranches
    : (currentBranchId && branchIdToNumericMap[currentBranchId]
        ? [branchIdToNumericMap[currentBranchId]]
        : selectedBranches);



  return (
    <div className={`analyticsContent ${isAdminBranch ? 'with-header' : 'without-header'}`}>


      {/* Controls Section */}
      <div className="w-full px-8 mb-6">
        {/* Branch Selector - Only for admin */}
        {isAdminBranch && (
          <Card className="rounded-3xl w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-5 w-5" />
                <h1>Branch Selection</h1>
              </CardTitle>
              <ExportButton />
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <Popover open={branchOpen} onOpenChange={setBranchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={branchOpen}
                    className="w-full justify-between"
                  >
                    {selectedBranches.length > 0
                      ? `${selectedBranches.length} selected`
                      : "Select branches"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search branches..." />
                    <CommandEmpty>No branch found.</CommandEmpty>
                    <CommandGroup>
                      {branchOptions.map((branch) => (
                        <CommandItem
                          key={branch.value}
                          onSelect={() => toggleBranch(branch.value)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedBranches.includes(branch.value)
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {branch.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {/* Selected Branches Display */}
              {branchOptions.length > 0 && selectedBranches.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected Branches:</p>
                  <div className="flex flex-wrap gap-2">
                    {branchOptions
                      .filter(branch => selectedBranches.includes(branch.value))
                      .map((branch) => {
                        // Use color from meta (already included on option); fallback to total color or a default.
                        const color = branch.label === 'Total of Branches' ? '#CE1616' : (branch.color || '#6366F1')
                        return (
                          <div
                            key={branch.value}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm border"
                            style={{ borderColor: color }}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-medium text-gray-700">{branch.label}</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* For non-admin users, show export button in top right */}
        {!isAdminBranch && (
          <div className="flex justify-end">
            <ExportButton />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="w-full px-8">
        <div className="space-y-6">
          {/* Daily Revenue Trend - Full Width */}
          <div className="w-full">
            <DailyRevenueTrend selectedBranches={effectiveSelectedBranches} branchMeta={branchMeta} />
          </div>

          {/* Sales Over Time with Day Details - Full Row */}
          <div className="w-full">
            <SalesOverTime selectedBranches={effectiveSelectedBranches} branchMeta={branchMeta} />
          </div>

          {/* Secondary Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <TopServices selectedBranches={effectiveSelectedBranches} />
              <SalesBreakdown selectedBranches={effectiveSelectedBranches} />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <MonthlyGrowthRate selectedBranches={effectiveSelectedBranches} branchMeta={branchMeta} />
              <TopCustomers />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
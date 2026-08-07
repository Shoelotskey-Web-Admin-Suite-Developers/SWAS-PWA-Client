"use client"
import { format } from "date-fns"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { SearchBar } from "@/components/ui/searchbar"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"

type PaymentStatus = "PAID" | "PARTIAL" | "NP"
type Branch = string
type BranchLocation = string
type SortKey = "dateIn" | "dateOut" | "total" | "amountPaid" | "remaining" | "customer" | ""

type FiltersProps = {
  search: string
  setSearch: (v: string) => void
  dateIn?: Date
  dateOut?: Date
  setDateIn: (d?: Date) => void
  setDateOut: (d?: Date) => void
  branch: Branch | ""
  setBranch: (b: Branch | "") => void
  paymentStatus: PaymentStatus | ""
  setPaymentStatus: (p: PaymentStatus | "") => void
  branchLocation: BranchLocation | ""
  setBranchLocation: (b: BranchLocation | "") => void
  sortKey: SortKey
  setSortKey: (k: SortKey) => void
  advanced: boolean
  setAdvanced: (v: boolean) => void
  showCustomerNames: boolean
  setShowCustomerNames: (v: boolean) => void
  showArchivedItems?: boolean
  setShowArchivedItems?: (v: boolean) => void
  branchOptions?: string[]
  branchLocationOptions?: string[]
  onClearFilters: () => void
  onExportRecords: () => void
  onArchiveRecords: () => void
}

export function Filters({
  search,
  setSearch,
  dateIn,
  dateOut,
  setDateIn,
  setDateOut,
  branch,
  setBranch,
  paymentStatus,
  setPaymentStatus,
  branchLocation,
  setBranchLocation,
  sortKey,
  setSortKey,
  advanced,
  setAdvanced,
  showCustomerNames,
  setShowCustomerNames,
  showArchivedItems = false,
  setShowArchivedItems,
  branchOptions,
  branchLocationOptions,
  onClearFilters,
  onExportRecords,
  onArchiveRecords,
}: FiltersProps) {
  const branchSelectOptions = branchOptions && branchOptions.length > 0
    ? branchOptions
    : []
  const branchLocationSelectOptions = branchLocationOptions && branchLocationOptions.length > 0
    ? branchLocationOptions
    : []

  return (
    <div className="cv-filters-panel">
      <div className="cv-filters-top">
        <div className="cv-filter-block cv-filter-block--search">
          <Label>Search Records</Label>
          <SearchBar value={search} onChange={setSearch} />
        </div>

        <div className="cv-filter-block cv-filter-block--date">
          <Label>Date In</Label>
          <DatePicker date={dateIn} onChange={setDateIn} />
        </div>

        <div className="cv-filter-block cv-filter-block--date">
          <Label>Date Out</Label>
          <DatePicker date={dateOut} onChange={setDateOut} />
        </div>

        <div className="cv-filter-block cv-filter-block--sort">
          <Label>Sort By</Label>
          <Select
            value={sortKey || "none"}
            onValueChange={(v) => setSortKey(v === "none" ? "" : (v as SortKey))}
          >
            <SelectTrigger className="cv-select cv-sort-trigger">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="dateIn">Date In</SelectItem>
              <SelectItem value="dateOut">Date Out</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="total">Total</SelectItem>
              <SelectItem value="amountPaid">Amount Paid</SelectItem>
              <SelectItem value="remaining">Remaining Balance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="unselected" className="cv-menu-btn" aria-label="Options">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-xl">
            <DropdownMenuItem onClick={onExportRecords}>Export Records</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={onArchiveRecords}>
              Archive Records
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="cv-filters-divider"></div>

      <div className="cv-filters-bottom">
        <div className="cv-toggle-area">
          <div className="cv-toggle-row">
            <Checkbox
              id="advanced"
              checked={advanced}
              onCheckedChange={(v) => setAdvanced(!!v)}
            />
            <Label htmlFor="advanced">Show Advanced Filters</Label>
          </div>

          <div className="cv-toggle-row">
            <Checkbox
              id="show-customer-names"
              checked={showCustomerNames}
              onCheckedChange={(checked) => setShowCustomerNames(checked === true)}
            />
            <Label htmlFor="show-customer-names">Show Customer Names</Label>
          </div>

          {setShowArchivedItems && (
            <div className="cv-toggle-row">
              <Checkbox
                id="show-archived"
                checked={showArchivedItems}
                onCheckedChange={(checked) => setShowArchivedItems(!!checked)}
              />
              <Label htmlFor="show-archived">Show Archived Items</Label>
            </div>
          )}

          <Button 
            variant="ghost" 
            className="cv-clear-btn extra-bold" 
            onClick={onClearFilters}
          >
            Clear all Filters
          </Button>
        </div>
      </div>

      {advanced && (
        <div className="cv-advanced-grid">
          <div className="cv-filter-block cv-advanced-branch">
            <Label>Branch</Label>
            <Select
              value={branch || "none"}
              onValueChange={(v) => setBranch(v === "none" ? "" : (v as Branch))}
            >
              <SelectTrigger className="cv-select">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All</SelectItem>
                {branchSelectOptions.map((branchName) => (
                  <SelectItem key={branchName} value={branchName}>{branchName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="cv-filter-block cv-advanced-location">
            <Label>Location</Label>
            <Select
              value={branchLocation || "none"}
              onValueChange={(v) =>
                setBranchLocation(v === "none" ? "" : (v as BranchLocation))
              }
            >
              <SelectTrigger className="cv-select">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All</SelectItem>
                {branchLocationSelectOptions.map((locationName) => (
                  <SelectItem key={locationName} value={locationName}>{locationName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="cv-filter-block cv-advanced-payment">
            <Label>Payment Status</Label>
            <Select
              value={paymentStatus || "none"}
              onValueChange={(v) =>
                setPaymentStatus(v === "none" ? "" : (v as PaymentStatus))
              }
            >
              <SelectTrigger className="cv-select">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All</SelectItem>
                <SelectItem value="PAID">PAID</SelectItem>
                <SelectItem value="PARTIAL">PARTIAL</SelectItem>
                <SelectItem value="NP">NP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}

/* ----------------- Local Date Picker ----------------- */
function DatePicker({
  date,
  onChange,
}: {
  date?: Date
  onChange: (d?: Date) => void
}) {
  return (
    <Input
      type="date"
      className="cv-date-btn"
      value={date ? format(date, "yyyy-MM-dd") : ""}
      onChange={(e) => {
        const val = e.target.value
        onChange(val ? new Date(val) : undefined)
      }}
    />
  )
}
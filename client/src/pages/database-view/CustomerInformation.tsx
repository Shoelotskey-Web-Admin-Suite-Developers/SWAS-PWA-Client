"use client"
import * as React from "react"
import { Label } from "@/components/ui/label"
import { SearchBar } from "@/components/ui/searchbar"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import "@/styles/database-view/customer-information.css"

import { CustomerTable } from "@/components/database-view/CustomerTable"
import type { CustomerRow as CustomerTableRow } from "@/components/database-view/central-view.types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { toast, Toaster } from "sonner"; // Add this import

import { getCustomers } from "@/utils/api/getCustomers" // 👈 your API util
import { exportCSV } from "@/utils/exportCSV"
import { deleteAllCustomers } from "@/utils/api/deleteAllCustomers";


/* ----------------------------- types ----------------------------- */
export type CustomerStatus = "Active" | "Stored"

export type CustomerRow = {
  id: string
  name: string
  birthday: string
  address: string
  email: string
  contact: string
  balance: number
  status: CustomerStatus
  currentServiceCount: number
  totalServices: number
}

/* ----------------------------- component ----------------------------- */
type SortKey = "name" | "birthday" | "balance" | "totalServices"

export default function CustomerInformation() {
  const [rows, setRows] = React.useState<CustomerRow[]>([])
  const [loading, setLoading] = React.useState(true)

  // filters
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<CustomerStatus | "">("")
  const [hasBalance, setHasBalance] = React.useState<"yes" | "no" | "">("")
  const [sortKey, setSortKey] = React.useState<SortKey | "">("")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")
  const [showFilters, setShowFilters] = React.useState(false)

  /* ----------------------------- fetch customers ----------------------------- */
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getCustomers()

        const mapped: CustomerRow[] = data.map((c: any, idx: number) => ({
          id: c.cust_id, // you can replace with c.cust_id if you prefer
          name: c.cust_name,
          birthday: c.cust_bdate ? new Date(c.cust_bdate).toISOString().split("T")[0] : "",
          address: c.cust_address || "",
          email: c.cust_email || "",
          contact: c.cust_contact || "",
          balance: 0, // placeholder, not in schema
          status: "Active", // placeholder, not in schema
          currentServiceCount: 0, // placeholder, not in schema
          totalServices: c.total_services || 0,
        }))

        setRows(mapped)
      } catch (err) {
        console.error("Error fetching customers:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  /* ----------------------------- filtering & sorting ----------------------------- */
  const filtered = React.useMemo(() => {
    let data = [...rows]

    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.contact.includes(q) ||
          r.address.toLowerCase().includes(q) ||
          r.birthday.includes(q)
      )
    }
    if (status) data = data.filter((r) => r.status === status)
    if (hasBalance === "yes") data = data.filter((r) => r.balance > 0)
    if (hasBalance === "no") data = data.filter((r) => r.balance === 0)

    if (sortKey) {
      data.sort((a, b) => {
        let result = 0
        switch (sortKey) {
          case "name":
            result = a.name.localeCompare(b.name)
            break
          case "birthday":
            result = a.birthday.localeCompare(b.birthday)
            break
          case "balance":
            result = a.balance - b.balance
            break
          case "totalServices":
            result = a.totalServices - b.totalServices
            break
        }
        return sortOrder === "asc" ? result : -result
      })
    }

    return data
  }, [rows, search, status, hasBalance, sortKey, sortOrder])

  const tableRows: CustomerTableRow[] = filtered.map((c) => ({ ...c }))

  /* ----------------------------- render ----------------------------- */
  return (
    <div className="ci-wrap">
      <div className="ci-header">
        <h1>Customer Information</h1>
      </div>

      {/* Search and Sort */}
      <div className="search-sorts">
        <div className="ci-width-full-767 w-[70%]">
          <Label>Search by Name, Birthday, Email, Contact</Label>
          <SearchBar value={search} onChange={setSearch} />
        </div>

        <div className="flex gap-4 w-[30%] ci-width-full-767 items-end">
          <div className="flex flex-col gap-1 w-full">
            <Label className="w-fit">Sort by</Label>
            <Select value={sortKey || "none"} onValueChange={(v) => setSortKey(v === "none" ? "" : (v as SortKey))}>
              <SelectTrigger className="ci-select">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="birthday">Birthday</SelectItem>
                <SelectItem value="balance">Balance</SelectItem>
                <SelectItem value="totalServices">Total Services</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <RadioGroup
            className="flex flex-col"
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v as "asc" | "desc")}
          >
            <div className="radio-option">
              <RadioGroupItem value="asc" id="asc" />
              <Label htmlFor="asc">Ascending</Label>
            </div>
            <div className="radio-option">
              <RadioGroupItem value="desc" id="desc" />
              <Label htmlFor="desc">Descending</Label>
            </div>
          </RadioGroup>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-10 w-10 p-0 flex items-center justify-center"
                variant="unselected"
                aria-label="Options"
              >
                <MoreVertical className="!w-10 !h-10" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => exportCSV(filtered)}>
                Export Records
              </DropdownMenuItem>
              <DropdownMenuItem
              className="text-red-600"
              onClick={async () => {
                if (!confirm("Are you sure you want to archive all customers? This cannot be undone.")) return;

                try {
                  await exportCSV(filtered);
                  await deleteAllCustomers();
                  setRows([]);
                  toast.success("All customers archived successfully"); // Success toast
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to archive customers. Export may have failed."); // Error toast
                }
              }}
            >
              Archive Records
            </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <div className="ci-filters ">
        {/* Desktop */}
        <div className="ci-filter-row hide-below-767">
          <div className="w-[20%] ci-width-half-767 ci-width-full-465">
            <Label>Status</Label>
            <Select value={status || "none"} onValueChange={(v) => setStatus(v === "none" ? "" : (v as CustomerStatus))}>
              <SelectTrigger className="ci-select">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Stored">Stored</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[20%] ci-width-half-767 ci-width-full-465">
            <Label>Has Balance</Label>
            <Select
              value={hasBalance || "none"}
              onValueChange={(v) => setHasBalance(v === "none" ? "" : (v as "yes" | "no"))}
            >
              <SelectTrigger className="ci-select">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile */}
        <div className="ci-show-767 ci-width-full-465">
          <div className="flex items-center gap-2 pt-[1.5rem] pb-[1rem]">
            <Checkbox
              id="advanced-filters"
              checked={showFilters}
              onCheckedChange={(checked) => setShowFilters(!!checked)}
            />
            <Label htmlFor="advanced-filters">Advanced Filters</Label>
          </div>

          {showFilters && (
            <div className="ci-filter-row">
              <div className="ci-width-half-767 ci-width-full-465">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as CustomerStatus | "")}>
                  <SelectTrigger className="ci-select">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Stored">Stored</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="ci-width-half-767 ci-width-full-465">
                <Label>Has Balance</Label>
                <Select value={hasBalance} onValueChange={(v) => setHasBalance(v as "yes" | "no" | "")}>
                  <SelectTrigger className="ci-select">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="ci-table">
        {loading ? <p>Loading customers...</p> : <CustomerTable rows={tableRows} />}
      </div>

      <Toaster position="top-center" richColors /> {/* Add Toaster here */}
    </div>
  )
}

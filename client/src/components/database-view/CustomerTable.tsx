// src/components/database-view/CustomerTable.tsx
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import "@/styles/database-view/customer-information.css"
import { EditCustomerDialog } from "@/components/database-view/EditCustomerDialog"

import type { CustomerRow } from "@/components/database-view/central-view.types"

interface CustomerTableProps {
  rows: CustomerRow[]
}

export function CustomerTable({ rows }: CustomerTableProps) {
  // local state mirrors props so we can mutate (delete/edit) locally
  const [customers, setCustomers] = React.useState<CustomerRow[]>(rows)
  const [openRow, setOpenRow] = React.useState<string | null>(null)
  const [hiddenCols, setHiddenCols] = React.useState<Record<string, boolean>>({})
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerRow | null>(null)

  // each field carries its own width class (ci-col-*) separate from the
  // responsive hide-below-* class, so columns no longer fight for width
  // just because they share a breakpoint.
  const fields = [
    { key: "name", label: "Name", hiddenBelow: 767, widthClass: "ci-col-name" },
    { key: "contact", label: "Contact", hiddenBelow: 767, widthClass: "ci-col-contact" },
    { key: "email", label: "Email", hiddenBelow: 767, widthClass: "ci-col-email" },
    { key: "address", label: "Address", hiddenBelow: 899, widthClass: "ci-col-address" },
    { key: "birthday", label: "Birthday", hiddenBelow: 899, widthClass: "ci-col-birthday" },
    { key: "balance", label: "Balance", hiddenBelow: 1220, widthClass: "ci-col-balance" },
    { key: "status", label: "Status", hiddenBelow: 1220, widthClass: "ci-col-status" },
    { key: "currentServiceCount", label: "Current Services", hiddenBelow: 1369, widthClass: "ci-col-current-services" },
    { key: "totalServices", label: "Total Services", hiddenBelow: 1369, widthClass: "ci-col-total-services" },
  ]

  // sync when parent rows prop changes
  React.useEffect(() => {
    setCustomers(rows)
  }, [rows])

  React.useEffect(() => {
    const updateHiddenCols = () => {
      const result: Record<string, boolean> = {}
      fields.forEach((f) => {
        result[f.key] = window.innerWidth <= f.hiddenBelow
      })
      setHiddenCols(result)
    }

    updateHiddenCols()
    window.addEventListener("resize", updateHiddenCols)
    return () => window.removeEventListener("resize", updateHiddenCols)
  }, [])

  const toggleRow = (id: string) => {
    setOpenRow(openRow === id ? null : id)
  }

  // called by EditCustomerDialog after successful deletion
  const handleCustomerDeleted = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id))
    // ensure dialog closes (dialog also calls onOpenChange(false) so this is extra-safety)
    setSelectedCustomer(null)
  }

  // called by EditCustomerDialog after successful edit/save
  const handleCustomerEdited = (updated: CustomerRow) => {
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
  }

  return (
    <div className="ci-table-container">
      <Table className="ci-table">
        <TableHeader className="ci-header">
          <TableRow className="ci-head-row">
            <TableHead className="ci-head-id"><h5>Customer ID</h5></TableHead>
            <TableHead className="hide-below-767 ci-col-name"><h5>Name</h5></TableHead>
            <TableHead className="hide-below-767 ci-col-contact"><h5>Contact</h5></TableHead>
            <TableHead className="hide-below-767 ci-col-email"><h5>Email</h5></TableHead>
            <TableHead className="hide-below-899 ci-col-address"><h5>Address</h5></TableHead>
            <TableHead className="hide-below-899 ci-col-birthday"><h5>Birthdate</h5></TableHead>
            <TableHead className="hide-below-1220 ci-col-balance"><h5>Balance</h5></TableHead>
            <TableHead className="hide-below-1220 ci-col-status cv-status"><h5>Status</h5></TableHead>
            <TableHead className="hide-below-1369 ci-col-current-services"><h5>Current Services</h5></TableHead>
            <TableHead className="hide-below-1369 ci-col-total-services"><h5>Total Services</h5></TableHead>
            <TableHead className="ci-head-action"><h5>Action</h5></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="ci-body">
          {customers.map((r) => {
            const hasHiddenCols = fields.some((f) => hiddenCols[f.key])
            return (
              <React.Fragment key={r.id}>
                <TableRow
                  className={`ci-row ${openRow === r.id ? "ci-row-open" : ""}`}
                  onClick={() => hasHiddenCols && toggleRow(r.id)}
                  style={{ cursor: hasHiddenCols ? "pointer" : "default" }}
                >
                  <TableCell className="ci-id">
                    <div className="cv-id-cell">
                      <span className="cv-id-value bold">{r.id}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hide-below-767 ci-col-name"><small>{r.name}</small></TableCell>
                  <TableCell className="hide-below-767 ci-col-contact"><small>{r.contact}</small></TableCell>
                  <TableCell className="hide-below-767 ci-col-email break-words whitespace-normal"><small>{r.email}</small></TableCell>
                  <TableCell className="hide-below-899 ci-col-address"><small>{r.address}</small></TableCell>
                  <TableCell className="hide-below-899 ci-col-birthday"><small>{r.birthday}</small></TableCell>
                  <TableCell className="hide-below-1220 ci-col-balance"><small>{r.balance}</small></TableCell>
                  <TableCell className="hide-below-1220 ci-col-status cv-status">
                    <span className={`extra-bold ci-status-${r.status.toLowerCase()}`}>
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell className="hide-below-1369 ci-col-current-services"><small>{r.currentServiceCount}</small></TableCell>
                  <TableCell className="hide-below-1369 ci-col-total-services"><small>{r.totalServices}</small></TableCell>
                  <TableCell className="ci-action">
                    <Button
                      className="ci-edit-btn extra-bold"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedCustomer(r)
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Accordion details for hidden columns */}
                {hasHiddenCols && openRow === r.id && (
                  <TableRow className="ci-row-details">
                    <TableCell colSpan={11}>
                      <div className="ci-details no-wrap">
                        {fields.map((f) => {
                          if (!hiddenCols[f.key]) return null
                          const value = r[f.key as keyof CustomerRow] ?? "—"
                          return (
                            <p key={f.key}>
                              <span className="bold">{f.label}:</span> {String(value)}
                            </p>
                          )
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>

      {selectedCustomer && (
        <EditCustomerDialog
          open={!!selectedCustomer}
          onOpenChange={(open) => {
            if (!open) setSelectedCustomer(null)
          }}
          customer={selectedCustomer}
          onCustomerDeleted={handleCustomerDeleted}
          onCustomerEdited={handleCustomerEdited}
        />
      )}
    </div>
  )
}
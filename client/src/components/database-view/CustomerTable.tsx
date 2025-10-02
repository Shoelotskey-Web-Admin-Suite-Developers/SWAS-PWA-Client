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

  const fields = [
    { key: "name", label: "Name", hiddenBelow: 767 },
    { key: "contact", label: "Contact", hiddenBelow: 767 },
    { key: "email", label: "Email", hiddenBelow: 767 },
    { key: "address", label: "Address", hiddenBelow: 899 },
    { key: "birthday", label: "Birthday", hiddenBelow: 899 },
    { key: "balance", label: "Balance", hiddenBelow: 1220 },
    { key: "status", label: "Status", hiddenBelow: 1220 },
    { key: "currentServiceCount", label: "Current Services", hiddenBelow: 1369 },
    { key: "totalServices", label: "Total Services", hiddenBelow: 1369 },
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
            <TableHead className="ci-head-id"><h5 className="extra-bold">Customer ID</h5></TableHead>
            <TableHead className="hide-below-767"><h5>Name</h5></TableHead>
            <TableHead className="hide-below-767"><h5>Contact</h5></TableHead>
            <TableHead className="hide-below-767"><h5>Email</h5></TableHead>
            <TableHead className="hide-below-899"><h5>Address</h5></TableHead>
            <TableHead className="hide-below-899"><h5>Birthdate</h5></TableHead>
            <TableHead className="hide-below-1220"><h5>Balance</h5></TableHead>
            <TableHead className="hide-below-1220"><h5>Status</h5></TableHead>
            <TableHead className="hide-below-1369"><h5>Current Services</h5></TableHead>
            <TableHead className="hide-below-1369"><h5>Total Services</h5></TableHead>
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
                  <TableCell className="ci-id"><h5>{r.id}</h5></TableCell>
                  <TableCell className="hide-below-767"><small>{r.name}</small></TableCell>
                  <TableCell className="hide-below-767"><small>{r.contact}</small></TableCell>
                  <TableCell className="hide-below-767 break-words whitespace-normal"><small>{r.email}</small></TableCell>
                  <TableCell className="hide-below-899"><small>{r.address}</small></TableCell>
                  <TableCell className="hide-below-899"><small>{r.birthday}</small></TableCell>
                  <TableCell className="hide-below-1220"><small>{r.balance}</small></TableCell>
                  <TableCell className="hide-below-1220"><small>{r.status}</small></TableCell>
                  <TableCell className="hide-below-1369"><small>{r.currentServiceCount}</small></TableCell>
                  <TableCell className="hide-below-1369"><small>{r.totalServices}</small></TableCell>
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

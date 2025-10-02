"use client"
import * as React from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import "@/styles/database-view/central-table.css"
import { EditReceiptDialog } from "@/components/database-view/EditReceiptDialog"

// ✅ Import types from dedicated file
import type { ReceiptRow } from "@/components/database-view/central-view.types"

interface CentralTableProps {
  rows: ReceiptRow[]
  onReceiptUpdate?: (updatedReceipt: ReceiptRow) => void
}

export function CentralTable({ rows, onReceiptUpdate }: CentralTableProps) {
  const [openRow, setOpenRow] = React.useState<string | null>(null)
  const [hiddenCols, setHiddenCols] = React.useState<Record<string, boolean>>({})
  const [selectedReceipt, setSelectedReceipt] = React.useState<ReceiptRow | null>(null)

  const fields = [
    { key: "dateIn", label: "Date In", hiddenBelow: 767 },
    { key: "receivedBy", label: "Received By", hiddenBelow: 899 },
    { key: "dateOut", label: "Date Out", hiddenBelow: 1024 },
    { key: "customer", label: "Customer", hiddenBelow: 767 },
    { key: "pairs", label: "Pairs", hiddenBelow: 1369 },
    { key: "released", label: "Released", hiddenBelow: 1220 },
    { key: "branch", label: "Branch", hiddenBelow: 1369 },
    { key: "branchLocation", label: "Location", hiddenBelow: 1220 },
    { key: "total", label: "Total", hiddenBelow: 767 },
    { key: "amountPaid", label: "Paid", hiddenBelow: 1024 },
    { key: "remaining", label: "Balance", hiddenBelow: 899 },
    { key: "status", label: "Status", hiddenBelow: 767 },
  ]

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

  return (
    <div className="cv-table-container">
      <Table className="cv-table">
        <TableHeader className="cv-header">
          <TableRow className="cv-head-row">
            <TableHead className="cv-head-id"><h5 className="extra-bold">Receipt</h5></TableHead>
            <TableHead className="hide-below-767"><h5>In</h5></TableHead>
            <TableHead className="hide-below-899"><h5>By</h5></TableHead>
            <TableHead className="hide-below-1024"><h5>Out</h5></TableHead>
            <TableHead className="hide-below-767"><h5>Cust</h5></TableHead>
            <TableHead className="hide-below-1369 cv-num"><h5># Pairs</h5></TableHead>
            <TableHead className="hide-below-1220 cv-num"><h5># Rlsd</h5></TableHead>
            <TableHead className="hide-below-1369"><h5>Br</h5></TableHead>
            <TableHead className="hide-below-1220"><h5>Loc</h5></TableHead>
            <TableHead className="hide-below-767 cv-num"><h5>Total</h5></TableHead>
            <TableHead className="hide-below-1024 cv-num"><h5>Paid</h5></TableHead>
            <TableHead className="hide-below-899 cv-num"><h5>Bal</h5></TableHead>
            <TableHead className="hide-below-767 cv-status"><h5>Status</h5></TableHead>
            <TableHead className="cv-head-action"><h5>Action</h5></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="cv-body">
          {rows.map((r) => {
            const hasHiddenCols = fields.some((f) => hiddenCols[f.key])

            return (
              <React.Fragment key={r.id}>
                <TableRow
                  className={`cv-row ${openRow === r.id ? "cv-row-open" : ""}`}
                  onClick={() => hasHiddenCols && toggleRow(r.id)}
                  style={{ cursor: hasHiddenCols ? "pointer" : "default" }}
                >
                  <TableCell className="cv-id"><h5>{r.id}</h5></TableCell>
                  <TableCell className="hide-below-767"><small>{format(r.dateIn, "yyyy-MM-dd")}</small></TableCell>
                  <TableCell className="hide-below-899"><small>{r.receivedBy}</small></TableCell>
                  <TableCell className="hide-below-1024"><small>{r.dateOut ? format(r.dateOut, "yyyy-MM-dd") : "—"}</small></TableCell>
                  <TableCell className="hide-below-767"><small>{r.customer}</small></TableCell>
                  <TableCell className="hide-below-1369 cv-num">{r.pairs}</TableCell>
                  <TableCell className="hide-below-1220 cv-num">{r.released}</TableCell>
                  <TableCell className="hide-below-1369"><small>{r.branch}</small></TableCell>
                  <TableCell className="hide-below-1220"><small>{r.branchLocation}</small></TableCell>
                  <TableCell className="hide-below-767 cv-num">{r.total}</TableCell>
                  <TableCell className="hide-below-1024 cv-num">{r.amountPaid}</TableCell>
                  <TableCell className="hide-below-899 cv-num">{r.remaining}</TableCell>
                  <TableCell className={`hide-below-767 cv-status cv-status-${r.status.toLowerCase()}`}>
                    {r.status}
                  </TableCell>
                  <TableCell className="cv-action extra-bold">
                    <Button
                      className="cv-edit-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedReceipt(r)
                      }}
                    >Edit
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Accordion details for hidden columns */}
                {hasHiddenCols && openRow === r.id && (
                  <TableRow className="cv-row-details">
                    <TableCell colSpan={15}>
                      <div className="cv-details">
                        {fields.map((f) => {
                          if (!hiddenCols[f.key]) return null
                          let value: any = r[f.key as keyof ReceiptRow]

                          if (f.key === "dateIn" && value) value = format(value, "PPpp")
                          if (f.key === "dateOut") value = value ? format(value, "PPpp") : "—"

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

      {selectedReceipt && (
        <EditReceiptDialog
          open={!!selectedReceipt}
          onOpenChange={(open) => {
            if (!open) setSelectedReceipt(null)
          }}
          receipt={selectedReceipt}
          onReceiptUpdate={onReceiptUpdate}
        />
      )}
    </div>
  )
}

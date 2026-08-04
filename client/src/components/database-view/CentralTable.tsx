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
  onReceiptUpdate?: (updatedReceipt: Partial<ReceiptRow> & { id: string; deleted?: boolean }) => void
}

export function CentralTable({ rows, onReceiptUpdate }: CentralTableProps) {
  const [openRow, setOpenRow] = React.useState<string | null>(null)
  const [hiddenCols, setHiddenCols] = React.useState<Record<string, boolean>>({})
  const [selectedReceipt, setSelectedReceipt] = React.useState<ReceiptRow | null>(null)

  const fields = [
    { key: "dateIn", label: "Date In", hiddenBelow: 1220 },
    { key: "dateOut", label: "Date Out", hiddenBelow: 1024 },
    { key: "receivedBy", label: "Received By", hiddenBelow: 1024 },
    { key: "customer", label: "Customer", hiddenBelow: 899 },
    { key: "pairs", label: "Pairs", hiddenBelow: 1369 },
    { key: "released", label: "Released", hiddenBelow: 1369 },
    { key: "branch", label: "Branch", hiddenBelow: 1220 },
    { key: "branchLocation", label: "Location", hiddenBelow: 1220 },
    { key: "total", label: "Total", hiddenBelow: 899 },
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
    <div className="cv-table-shell">
      <Table className="cv-table">
        <TableHeader className="cv-header">
          <TableRow className="cv-head-row">
            <TableHead className="cv-head-id"><h5>Receipt ID</h5></TableHead>
            <TableHead className="hide-below-1220"><h5>Dates (In/Out)</h5></TableHead>
            <TableHead className="hide-below-899"><h5>Customer / Staff</h5></TableHead>
            <TableHead className="hide-below-1369 cv-num"><h5>Pairs</h5></TableHead>
            <TableHead className="hide-below-1369 cv-num"><h5>Released</h5></TableHead>
            <TableHead className="hide-below-1220"><h5>Branch Details</h5></TableHead>
            <TableHead className="hide-below-899"><h5>Accounting</h5></TableHead>
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
                  <TableCell className="cv-id">
                    <div className="cv-id-cell">
                      <span className="cv-id-value">{r.id}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hide-below-1220">
                    <div className="cv-stack">
                      <span className="cv-main-value">{format(r.dateIn, "yyyy-MM-dd")}</span>
                      <span className="cv-sub-value">
                        {r.dateOut ? `Out: ${format(r.dateOut, "yyyy-MM-dd")}` : "Out: —"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hide-below-899">
                    <div className="cv-stack">
                      <span className="cv-main-value">{r.customer}</span>
                      <span className="cv-sub-value">{r.receivedBy}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hide-below-1369 cv-num">
                    <div className="cv-pair-stack">
                      <span className="cv-mini-badge">{r.pairs}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hide-below-1369 cv-num">
                    <span className="cv-main-value">{r.released}</span>
                  </TableCell>
                  <TableCell className="hide-below-1220">
                    <div className="cv-stack">
                      <span className="cv-main-value">{r.branch}</span>
                      <span className="cv-sub-value">{r.branchLocation}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hide-below-899">
                    <div className="cv-stack cv-money-stack">
                      <span className="cv-money">{formatMoney(r.total)}</span>
                      <span className={`cv-sub-value ${r.status === "PAID" ? "cv-paid" : r.status === "PARTIAL" ? "cv-partial" : "cv-unpaid"}`}>
                        {r.status === "PAID"
                          ? `Paid: ${formatMoney(r.amountPaid)}`
                          : `Bal: ${formatMoney(r.remaining)}`}
                      </span>
                    </div>
                  </TableCell>
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
                    <TableCell colSpan={8}>
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
          onReceiptUpdate={onReceiptUpdate as any}
        />
      )}
    </div>
  )
}

function formatMoney(value: number) {
  return `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 })}`
}

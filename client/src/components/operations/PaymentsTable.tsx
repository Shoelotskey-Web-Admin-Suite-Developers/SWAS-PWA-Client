"use client"

import * as React from "react"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import "@/styles/payment.css"
import "@/styles/components/paymentsTable.css"
import { useMediaQuery } from "@/hooks/useMediaQuery"

type Shoe = {
  model: string
  services: string[]
  additionals: string[]
  pairs?: number
  rush?: "yes" | "no"
  lineItemId?: string
}

export type Request = {
  receiptId: string
  dateIn: string
  customerId: string
  customerName: string
  total: number
  pairs: number
  pairsReleased: number
  shoes: Shoe[]
  amountPaid: number
  remainingBalance: number
  discount: number | null
  storageFee?: number
}

type Props = {
  requests: Request[]
  selectedRequest: Request | null
  onSelect: (req: Request | null, lineItemId?: string | null) => void
  selectedLineItemId?: string | null
  findServicePrice: (srv: string) => number
  formatCurrency?: (n: number) => string
  RUSH_FEE: number
}

export const PaymentsTable: React.FC<Props> = ({
  requests,
  selectedRequest,
  onSelect,
  selectedLineItemId,
  findServicePrice: _findServicePrice,
  formatCurrency = (n) =>
    n.toLocaleString("en-PH", { style: "currency", currency: "PHP" }),
  RUSH_FEE: _RUSH_FEE,
}) => {
  const [expandedLine, setExpandedLine] = React.useState<string | null>(null)

  const toggleExpanded = (lineId: string) =>
    setExpandedLine((prev) => (prev === lineId ? null : lineId))

  // determine which columns are hidden by viewport width
  const hidePairs = useMediaQuery("(max-width: 1220px)")
  const hideCustomer = useMediaQuery("(max-width: 1088px)")
  const hideTotal = useMediaQuery("(max-width: 1369px)")
  const hidePaid = useMediaQuery("(max-width: 899px)")
  const hideDate = useMediaQuery("(max-width: 767px)")

  const anyColumnHidden = hidePairs || hideCustomer || hideTotal || hidePaid || hideDate

  return (
    <div className="payment-table-wrapper">
      <Table className="payment-table">
        <TableHeader className="payment-table-header">
          <TableRow>
            <TableHead className="col-transaction">Receipt ID</TableHead>
            <TableHead className="hide-below-767 col-date">Date In</TableHead>
            <TableHead className="hide-below-1088 col-customer">Customer</TableHead>
            <TableHead className="hide-below-1220 text-center col-pairs"># of Pairs</TableHead>
            <TableHead className="hide-below-1369 text-right col-total">Total</TableHead>
            <TableHead className="hide-below-899 text-right col-paid">Amount Paid</TableHead>
            <TableHead className="text-right col-balance">Remaining Balance</TableHead>
            <TableHead className="text-right col-action">Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="payment-table-body">
          {requests.flatMap((req) => {
            const isRequestSelected = selectedRequest?.receiptId === req.receiptId

            const handleRowClick = (lineItemId?: string) => {
              if (lineItemId) toggleExpanded(lineItemId)
              if (isRequestSelected && selectedLineItemId === lineItemId) {
                onSelect(null, null)
              } else {
                onSelect(req, lineItemId ?? null)
              }
            }

            const handleButtonClick = (e: React.MouseEvent, lineItemId?: string) => {
              e.stopPropagation()
              if (lineItemId) toggleExpanded(lineItemId)
              if (isRequestSelected && selectedLineItemId === lineItemId) {
                onSelect(null, null)
              } else {
                onSelect(req, lineItemId ?? null)
              }
            }

            return req.shoes.map((shoe, idx) => {
              const lineItemId = shoe.lineItemId || `${req.receiptId}-${idx + 1}`
              const balanceForShoe = (req.remainingBalance ?? 0) + (req.storageFee ?? 0)
              const isExpanded = expandedLine === lineItemId
              const isSelected = isRequestSelected && selectedLineItemId === lineItemId

              return (
                <React.Fragment key={lineItemId}>
                  <TableRow
                    className={`cursor-pointer ${isSelected ? "selected-row" : ""}`}
                    onClick={() => handleRowClick(lineItemId)}
                    aria-expanded={isExpanded}
                  >
                    <TableCell className="col-transaction">
                      <p className="payment-cell-receipt">{req.receiptId}</p>
                      <p className="payment-cell-shoe-sub">{shoe.model || "Unnamed Shoe"}</p>
                    </TableCell>

                    <TableCell className="hide-below-767 col-date payment-cell-date">
                      {req.dateIn}
                    </TableCell>

                    <TableCell className="hide-below-1088 col-customer payment-cell-customer">
                      {req.customerName}
                    </TableCell>

                    <TableCell className="hide-below-1220 text-center col-pairs">
                      <span className="payment-cell-pairs-pill">
                        {req.pairs} {req.pairs === 1 ? "Pair" : "Pairs"}
                      </span>
                    </TableCell>

                    <TableCell className="hide-below-1369 text-right col-total payment-cell-total">
                      {formatCurrency(req.total)}
                    </TableCell>

                    <TableCell className="hide-below-899 text-right col-paid payment-cell-paid">
                      {formatCurrency(req.amountPaid)}
                    </TableCell>

                    <TableCell className="text-right col-balance payment-cell-balance">
                      {formatCurrency(balanceForShoe)}
                    </TableCell>

                    <TableCell className="col-action">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className={`payment-select-btn ${isSelected ? "payment-select-btn-active" : ""}`}
                          onClick={(e) => handleButtonClick(e, lineItemId)}
                        >
                          {isSelected ? "Selected" : "Select Order"}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {anyColumnHidden && isExpanded && (
                    <TableRow className="accordion-row expanded" role="region" aria-hidden={!isExpanded}>
                      <TableCell className="accordion-cell" colSpan={8}>
                        <div className="accordion-content">
                          <div className="accordion-left">
                            <div><strong>Line-item:</strong> {lineItemId}</div>
                            {hideDate && <div><strong>Date In:</strong> {req.dateIn}</div>}
                            {hideCustomer && <div><strong>Customer:</strong> {req.customerName}</div>}
                            {hidePairs && <div><strong>Pairs:</strong> {req.pairs} (Released: {req.pairsReleased})</div>}
                          </div>
                          <div className="accordion-right">
                            {hideTotal && <div><strong>Total:</strong> {formatCurrency(req.total)}</div>}
                            {hidePaid && <div><strong>Amount Paid:</strong> {formatCurrency(req.amountPaid)}</div>}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })
          })}
        </TableBody>
      </Table>
    </div>
  )
}
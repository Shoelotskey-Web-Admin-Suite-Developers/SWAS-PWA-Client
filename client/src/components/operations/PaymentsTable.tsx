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
import { Button } from "@/components/ui/button"
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
  // optional storage fee to display alongside balance
  storageFee?: number
}

type Props = {
  requests: Request[]
  selectedRequest: Request | null
  // onSelect now receives the request and the selected lineItemId (or null)
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
  // Diagnostic: log incoming requests and total line-items
  try {
    const totalShoes = requests.reduce((sum, r) => sum + (r.shoes?.length || 0), 0)
    console.debug("PaymentsTable: requests=", requests.length, "totalShoes=", totalShoes)
  } catch (e) {
    /* ignore logging errors */
  }
  const [expandedLine, setExpandedLine] = React.useState<string | null>(null)

  const toggleExpanded = (lineId: string) =>
    setExpandedLine((prev) => (prev === lineId ? null : lineId))

  // determine which columns are hidden by viewport width
  const hidePairs = useMediaQuery("(max-width: 1220px)")
  const hideReleased = useMediaQuery("(max-width: 1220px)")
  const hideCustomer = useMediaQuery("(max-width: 1088px)")
  const hideBalance = useMediaQuery("(max-width: 1369px)")
  const hideLineItem = useMediaQuery("(max-width: 535px)")

  const anyColumnHidden = hidePairs || hideReleased || hideCustomer || hideBalance || hideLineItem

  return (
    <Table className="payment-table">
      {/* Header */}
      <TableHeader className="payment-table-header">
        <TableRow>
          <TableHead className="text-center col-transaction">Transaction ID</TableHead>
          <TableHead className="hide-below-1220 hide-below-767 text-center col-pairs"># Prs</TableHead>
          <TableHead className="hide-below-1220 hide-below-767 text-center col-released"># Rlsd</TableHead>
          <TableHead className="text-center col-lineitem hide-below-535">Line-item ID</TableHead>
          <TableHead className="hide-below-1088 hide-below-767 text-center col-customer">Customer</TableHead>
          <TableHead className="text-center col-shoe">Shoe</TableHead>
          <TableHead className="hide-below-1369 hide-below-899 text-center col-balance">Balance</TableHead>
          <TableHead className="text-center col-action">Action</TableHead>
        </TableRow>
      </TableHeader>

      {/* Body */}
      <TableBody className="payment-table-body">
        {requests.flatMap((req) => {
          // determine selection at the line-item level: parent provides selectedRequest and selectedLineItemId
          const isRequestSelected = selectedRequest?.receiptId === req.receiptId

          // Note: we intentionally do not distribute remaining balance per shoe here.
          // The table shows the transaction-level remaining balance (req.remainingBalance).

          const handleRowClick = (lineItemId?: string) => {
            // toggle expanded for the clicked line, also set selection for the request+line
            if (lineItemId) toggleExpanded(lineItemId)
            // if already selected (same request & same line) then deselect
            console.debug('PaymentsTable: handleRowClick', { receiptId: req.receiptId, lineItemId, isRequestSelected, selectedLineItemId })
            if (isRequestSelected && selectedLineItemId === lineItemId) {
              onSelect(null, null)
            } else {
              onSelect(req, lineItemId ?? null)
            }
          }

          const handleButtonClick = (e: React.MouseEvent, lineItemId?: string) => {
            e.stopPropagation()
            if (lineItemId) toggleExpanded(lineItemId)
            console.debug('PaymentsTable: handleButtonClick', { receiptId: req.receiptId, lineItemId, isRequestSelected, selectedLineItemId })
            if (isRequestSelected && selectedLineItemId === lineItemId) {
              onSelect(null, null)
            } else {
              onSelect(req, lineItemId ?? null)
            }
          }

          // For each shoe create a row (line-item)
          return req.shoes.map((shoe, idx) => {
            // Prefer DB-provided lineItemId if present; otherwise fall back to generated id
            const lineItemId = shoe.lineItemId || `${req.receiptId}-${idx + 1}`
            // Display transaction-level remaining balance (total_amount - amount_paid)
            // plus any storage fee (per user's request the Balance should include storage fee)
            const balanceForShoe = (req.remainingBalance ?? 0) + (req.storageFee ?? 0)

            const isExpanded = expandedLine === lineItemId

            // Selected if parent selectedRequest matches and the selectedLineItemId matches this line
            const isSelected = isRequestSelected && selectedLineItemId === lineItemId

            return (
              // Use fragment so we can return the data row and the accordion detail row
              <React.Fragment key={lineItemId}>
                <TableRow
                  className={`cursor-pointer ${
                    isSelected
                      ? "bg-green-100 border-b border-green-100 hover:bg-green-100"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleRowClick(lineItemId)}
                  aria-expanded={isExpanded}
                >
                  <TableCell className="col-transaction">{req.receiptId}</TableCell>
                  <TableCell className="hide-below-1220 text-center col-pairs">{req.pairs}</TableCell>
                  <TableCell className="hide-below-1220 text-center col-released">{req.pairsReleased}</TableCell>
                  <TableCell className="text-center col-lineitem hide-below-535">{lineItemId}</TableCell>
                  <TableCell className="hide-below-1088 col-customer">{req.customerName}</TableCell>
                  <TableCell className="col-shoe">{shoe.model}</TableCell>
                  <TableCell className="hide-below-1369 text-center col-balance">{formatCurrency(balanceForShoe)}</TableCell>
                  <TableCell className="col-action">
                    <div className="flex justify-center">
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => handleButtonClick(e, lineItemId)}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Accordion detail row - render only when a relevant column is hidden and this line is expanded */}
                {anyColumnHidden && isExpanded && (
                  <TableRow className={`accordion-row expanded `} role="region" aria-hidden={!isExpanded}>
                    <TableCell className="accordion-cell" colSpan={8}>
                      <div className="accordion-content">
                        <div className="accordion-left">
                          {/* Show only hidden columns here so the accordion mirrors what the row is missing */}
                          {hideLineItem && <div><strong className="bold">Line-item:</strong> {lineItemId}</div>}
                          {hideCustomer && <div><strong className="bold">Customer:</strong> {req.customerName}</div>}
                          {hidePairs && <div><strong className="bold">Pairs:</strong> {req.pairs}</div>}
                          {hideReleased && <div><strong className="bold">Released:</strong> {req.pairsReleased}</div>}
                          {hideBalance && <div><strong className="bold">Balance:</strong> {formatCurrency(balanceForShoe)}</div>}
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
  )
}

// src/pages/operations/payment.tsx
"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { SearchBar } from "@/components/ui/searchbar"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import "@/styles/payment.css"
import { PaymentsTable } from "@/components/operations/PaymentsTable"
import { getAllLineItems } from "@/utils/api/getAllLineItems"
import { getTransactionById } from "@/utils/api/getTransactionById"
import { applyPayment } from "@/utils/api/applyPayment"
import { getServices, IService } from "@/utils/api/getServices"
import { getUserName } from "@/utils/api/getUserName"
import { exportReceiptPDF } from "@/utils/exportReceiptPDF"
import {
  formatCurrency,
  calculateTotal,
  RUSH_FEE,
  computeStorageFeeFromLineItems,
  getUpdatedStatus,
  computeStorageFeeDiagnostics,
} from "@/utils/paymentHelpers"
import { updateLineItemStorageFee } from "@/utils/api/updateLineItemStorageFee"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { usePaymentsLineItemSocket } from "@/hooks/usePaymentsLineItemSocket"
// (Removed socket diagnostics UI imports)

type Shoe = {
  model: string
  services: string[]
  additionals: string[]
  pairs?: number
  rush?: "yes" | "no"
  // track the DB line item id and current status so we can validate pickup
  lineItemId?: string
  currentStatus?: string
}

type Request = {
  receiptId: string
  dateIn: string
  customerId: string
  customerName: string
  // customer address (optional)
  customerAddress?: string
  total: number
  pairs: number
  pairsReleased: number
  shoes: Shoe[]
  amountPaid: number
  remainingBalance: number
  discount: number | null
  // total storage fee (sum of per-line-item storage charges)
  storageFee?: number
  // list of payment ids attached to this transaction
  payments?: string[]
}

// helpers imported from paymentHelpers

// --- Dummy Data ---
// (dummy generator removed) real data will be fetched from APIs

export default function Payments() {
  const [dueNow, setDueNow] = useState(0)
  const [customerPaid, setCustomerPaid] = useState(0)
  const [change, setChange] = useState(0)
  const [updatedBalance, setUpdatedBalance] = useState(0)
  const [cashier, setCashier] = useState("")
  const [cashierDefault, setCashierDefault] = useState("")

  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"default" | keyof Request>("default")
  const [sortOrder, setSortOrder] = useState<"Ascending" | "Descending">("Ascending")
  const [modeOfPayment, setModeOfPayment] = useState<'cash' | 'gcash' | 'bank' | 'other'>('cash')
  const [paymentOnly, setPaymentOnly] = useState(false)

  const [servicesList, setServicesList] = useState<IService[]>([])
  const [fetchedRequests, setFetchedRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  // Real-time: remove line items that become Picked Up via socket
  const handleLineItemPickedUp = useCallback((lineItemId: string) => {
    if (!lineItemId) return;
    setFetchedRequests((prev) => {
      let changed = false;
      const updated = prev.map(req => {
        const remainingShoes = req.shoes.filter(s => s.lineItemId !== lineItemId);
        if (remainingShoes.length !== req.shoes.length) {
          changed = true;
          return { ...req, shoes: remainingShoes };
        }
        return req;
      }).filter(req => req.shoes.length > 0); // drop requests with no remaining shoes

      if (changed) {
        // If the currently selected line item was removed, clear selection
        setSelectedRequest(sel => sel && !updated.find(r => r.receiptId === sel.receiptId) ? null : sel);
        setSelectedLineItemId(prevLineId => prevLineId === lineItemId ? null : prevLineId);
      }
      return updated;
    });
  }, []);

  usePaymentsLineItemSocket({
    onPickedUp: handleLineItemPickedUp,
    onUpdate: (lineItemId, _change, updatedFields, fullDocument) => {
      // Update shoe model name in-place if changed
      if (updatedFields.shoes || fullDocument?.shoes) {
        const newModel = updatedFields.shoes || fullDocument?.shoes;
        setFetchedRequests(prev => prev.map(req => {
          let modified = false;
          const newShoes = req.shoes.map(shoe => {
            if (shoe.lineItemId === lineItemId) {
              modified = true;
              return { ...shoe, model: newModel };
            }
            return shoe;
          });
          return modified ? { ...req, shoes: newShoes } : req;
        }));
      }
      // If status updated to Picked Up but race prevented onPickedUp earlier
      const status = updatedFields.current_status || fullDocument?.current_status;
      if (status === 'Picked Up') {
        handleLineItemPickedUp(lineItemId);
      }
    },
    onAnyChange: (evt) => {
      if (evt.updateDescription?.updatedFields?.current_status === 'Picked Up') {
        console.debug('Payments socket: line item picked up event received', evt.documentKey?._id);
      }
    }
  });

  // Function to clear payment form fields
  const clearPaymentFields = () => {
    setDueNow(0);
    setCustomerPaid(0);
    setChange(0);
    setUpdatedBalance(0);
    setCashier(cashierDefault);
    setModeOfPayment('cash');
    setPaymentOnly(false);
  };
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [selectedLineItemId, setSelectedLineItemId] = useState<string | null>(null)
  
  // Loading states for payment operations
  const [isSavingPayment, setIsSavingPayment] = useState(false)
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)


  // Build lookup maps for service prices (service_id -> price)
  const servicePriceByName = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of servicesList) map.set(s.service_name, s.service_base_price)
    return map
  }, [servicesList])

  useEffect(() => {
    const fetchCashierName = async () => {
      const userId = sessionStorage.getItem("user_id")
      if (!userId) {
        const fallback = "Unknown Cashier"
        setCashier(fallback)
        setCashierDefault(fallback)
        return
      }

      try {
        const result = await getUserName(userId)
        const resolved = result?.user_name && result.user_name.trim().length > 0
          ? result.user_name.trim()
          : userId
        setCashier(resolved)
        setCashierDefault(resolved)
      } catch (error) {
        console.error("Failed to fetch cashier name:", error)
        setCashier(userId)
        setCashierDefault(userId)
      }
    }

    fetchCashierName()
  }, [])

  // adapt existing findServicePrice/findAddonPrice to consult service list first
  function findServicePriceFromList(serviceName: string) {
    const val = servicePriceByName.get(serviceName)
    // if not found in services list, fall back to 0 (server should provide prices)
    return val ?? 0
  }

  // Fetch services and line items on mount and map to Request[] shape
  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const svc = await getServices()
        if (!mounted) return
        setServicesList(svc)

        // Fetch all relevant line items (backend excludes Picked Up)
        const lineItems = await getAllLineItems()

        // Diagnostic logs to inspect raw line items and transaction ids
        try {
          console.debug("Payments page: raw lineItems count=", Array.isArray(lineItems) ? lineItems.length : 0)
          console.debug("Payments page: currentBranchId=", sessionStorage.getItem("branch_id"))
          console.debug(
            "Payments page: line_item_ids=",
            Array.isArray(lineItems) ? lineItems.map((li: any) => li.line_item_id).slice(0, 20) : []
          )
        } catch (e) {
          /* ignore */
        }

        // Handle case where no line items are returned
        if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
          console.debug("Payments page: No line items found, setting empty requests array")
          if (mounted) {
            setFetchedRequests([])
          }
          return
        }

        // Group line items by transaction ID to avoid duplicate API calls
        const txGroups = new Map<string, any[]>()
        lineItems.forEach((li: any) => {
          const txId = li.transaction_id
          if (!txGroups.has(txId)) {
            txGroups.set(txId, [])
          }
          txGroups.get(txId)!.push(li)
        })

        console.debug("Payments page: unique transactions count=", txGroups.size)

        const requests: Request[] = []

        for (const [txId, txLineItems] of txGroups.entries()) {
          try {
            // Use pre-loaded transaction data if available, otherwise fetch
            const firstItem = txLineItems[0]
            let transaction, customer, fullLineItems
            
            if (firstItem._transaction) {
              // Use pre-loaded data (much faster)
              transaction = firstItem._transaction
              customer = firstItem._customer
              fullLineItems = txLineItems
            } else {
              // Fallback to API call if needed
              const txData = await getTransactionById(String(txId))
              transaction = txData.transaction
              customer = txData.customer
              fullLineItems = txData.lineItems || []
            }

            // Diagnostic: log raw lineItems for this transaction
            try {
              console.debug('Payments page: txLineItems for', txId, fullLineItems.map((li: any) => ({ line_item_id: li.line_item_id, services: li.services })))
            } catch (e) {}

            // Map server line items to local Shoe[] style
            // Also compute storage fee per line item using computePickupAllowance
            let storageFeeTotal = 0
            const shoes: Shoe[] = fullLineItems.map((li: any) => {
              // li.services is an array of { service_id, quantity }
              const servicesNames: string[] = []
              ;(li.services || []).forEach((s: any) => {
                // try to resolve service_name from services list
                const found = svc.find((x: IService) => x.service_id === s.service_id || x.service_name === s.service_id)
                const name = found ? found.service_name : s.service_id
                const qty = s.quantity || 1
                for (let i = 0; i < qty; i++) servicesNames.push(name)
              })

              // Diagnostic: log mapping per line item (service quantities -> servicesNames)
              try {
                console.debug('Payments page: mapped lineItem', li.line_item_id, { rawServices: li.services, servicesNames })
              } catch (e) {}

              return {
                model: li.shoes || "",
                services: servicesNames,
                additionals: [],
                pairs: 1,
                rush: li.priority === "Rush" ? "yes" : "no",
                lineItemId: li.line_item_id || undefined,
                currentStatus: li.current_status || li.status || undefined,
              }
            })

            // compute storage fee using helper + diagnostics
            try {
              const diagnostics = computeStorageFeeDiagnostics(fullLineItems)
              storageFeeTotal = diagnostics.totalIncremental
              const debugMode = typeof window !== 'undefined' && window.location.search.includes('storageDebug')
              if (debugMode) {
                try {
                  ;(window as any).storageFeeDiagnostics = (window as any).storageFeeDiagnostics || {}
                  ;(window as any).storageFeeDiagnostics[txId] = diagnostics
                  console.log('[storageFee][diag] tx', txId, diagnostics)
                } catch(_){}
              }
            } catch (e) {
              console.debug('Failed computing storage fees', e)
            }

            // Prefer explicit transaction amounts from the server. If missing, fall back to local calculation.
            const totalFromTx =
              transaction.total_amount !== undefined && transaction.total_amount !== null
                ? transaction.total_amount
                : calculateTotal(shoes, transaction.discount_amount ?? null, findServicePriceFromList)
            const amountPaid = transaction.amount_paid ?? 0
            // Balance is defined as total_amount - amount_paid per requirement
            const remaining = Math.max(0, totalFromTx - amountPaid)

            const req: Request = {
              receiptId: transaction.transaction_id,
              dateIn: new Date(transaction.date_in).toLocaleDateString(),
              customerId: customer?.cust_id || transaction.cust_id || "",
              customerName: customer?.cust_name || "",
              customerAddress: customer?.cust_address || transaction.cust_address || "",
              // use the explicit transaction total when available
              total: totalFromTx,
              pairs: transaction.no_pairs || shoes.length,
              pairsReleased: transaction.no_released || 0,
              shoes,
              amountPaid: amountPaid,
              // remaining balance = total_amount - amount_paid
              remainingBalance: remaining,
              discount: transaction.discount_amount ?? null,
              storageFee: storageFeeTotal > 0 ? storageFeeTotal : 0,
              payments: Array.isArray(transaction.payments) ? transaction.payments : [],
            }

            requests.push(req)
            // Preload payment ids for this transaction (no state mutation here) - optional
            // We won't call loadPaymentsForTransaction here to avoid extra network calls during bulk load
          } catch (err) {
            console.error("Failed to load transaction", txId, err)
          }
        }

        if (mounted) {
          // Diagnostic log: how many requests and shoes were mapped
          try {
            // keep logs small but useful
            console.debug("Payments page: mapped requests count=", requests.length)
            console.debug(
              "Payments page: shoes per request=",
              requests.map((r) => r.shoes.length)
            )
          } catch (e) {
            /* ignore logging errors */
          }
          setFetchedRequests(requests)
        }
      } catch (err) {
        console.error("Error loading payments data:", err)
        
        // If it's the "No line items found" error, set empty array instead of showing error
        if (err instanceof Error && err.message.includes("No line items found")) {
          console.debug("Payments page: Handling 'No line items found' - setting empty requests")
          if (mounted) {
            setFetchedRequests([])
          }
        } else {
          // For other errors, show a user-friendly message but don't break the UI
          console.error("Failed to load payment data. The system may be empty or there could be a connection issue.")
        }
      }
      finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  // helper: fetch payment details for an array of payment_ids stored on transaction
  async function loadPaymentsForTransaction(paymentIds?: string[]) {
    if (!paymentIds || paymentIds.length === 0) return

    try {
      const { getPaymentById } = await import("@/utils/api/getPaymentById")
      await Promise.all(paymentIds.map((pid) => getPaymentById(String(pid)).catch((e) => {
        console.debug('Failed to load payment', pid, e)
        return null
      })))
    } catch (e) {
      console.debug('Error loading payments for transaction', e)
    }
  }

  // Filter + Sort over fetchedRequests
  const filteredRequests = useMemo(() => {
    let filtered = fetchedRequests

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          // receipt id
          r.receiptId.toLowerCase().includes(q) ||
          // customer name
          r.customerName.toLowerCase().includes(q) ||
          // any shoe model matches
          r.shoes.some((s) => (s.model || "").toLowerCase().includes(q)) ||
          // any shoe lineItemId matches
          r.shoes.some((s) => (s as any).lineItemId && (s as any).lineItemId.toLowerCase().includes(q))
      )
    }

    if (sortBy !== "default") {
      filtered = [...filtered].sort((a, b) => {
        let valA: unknown = a[sortBy]
        let valB: unknown = b[sortBy]

        // Support sorting by receiptId (string) and pairs (number)
        if (sortBy === "dateIn") {
          valA = new Date(a.dateIn)
          valB = new Date(b.dateIn)
        }

        if (sortBy === "total") {
          valA = a.total
          valB = b.total
        }

        if (sortBy === "receiptId") {
          valA = a.receiptId
          valB = b.receiptId
        }

        if (sortBy === "pairs") {
          valA = a.pairs
          valB = b.pairs
        }

        if (valA instanceof Date && valB instanceof Date) {
          if (valA < valB) return sortOrder === "Ascending" ? -1 : 1
          if (valA > valB) return sortOrder === "Ascending" ? 1 : -1
          return 0
        }

        if (typeof valA === "number" && typeof valB === "number") {
          if (valA < valB) return sortOrder === "Ascending" ? -1 : 1
          if (valA > valB) return sortOrder === "Ascending" ? 1 : -1
          return 0
        }

        if (typeof valA === "string" && typeof valB === "string") {
          return sortOrder === "Ascending"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA)
        }

        return 0
      })
    }

    return filtered
  }, [fetchedRequests, searchQuery, sortBy, sortOrder])

  // Log diagnostics whenever selectedRequest changes
  useEffect(() => {
    if (!selectedRequest) {
      try { console.log('[storageFee] selection cleared'); } catch(_){}
      return
    }
    try {
      console.log('[storageFee] selectedRequest', {
        receiptId: selectedRequest.receiptId,
        storageFee: selectedRequest.storageFee,
        remainingBalanceBase: selectedRequest.remainingBalance,
        displayedBalance: (selectedRequest.remainingBalance ?? 0) + (selectedRequest.storageFee ?? 0),
        amountPaid: selectedRequest.amountPaid,
        total: selectedRequest.total,
      })
    } catch(_){}
  }, [selectedRequest])

  const handleCustomerPaid = (value: number) => {
    setCustomerPaid(value)
    if (!selectedRequest) return
    // Validation is enforced at save-time; do not alert while typing
    // Change is customerPaid - dueNow, but never negative
    setChange(Math.max(0, value - dueNow))
  }

  const handleDueNow = (value: number) => {
    // Clamp the due now value to be between 0 and the transaction remaining balance + storage fee
    const combinedBalanceForClamp = selectedRequest ? ((selectedRequest.remainingBalance ?? 0) + (selectedRequest.storageFee ?? 0)) : Number.POSITIVE_INFINITY
    const clamped = Math.max(0, Math.min(value, combinedBalanceForClamp))
    setDueNow(clamped)
    if (!selectedRequest) return
    const newTotalPaid = selectedRequest.amountPaid + clamped
    setUpdatedBalance(Math.max(0, (selectedRequest.total - newTotalPaid) + (selectedRequest.storageFee ?? 0)))
  // Update change to reflect current customerPaid - dueNow, but never negative
  setChange(Math.max(0, customerPaid - clamped))
    // Validation is enforced at save-time; do not alert while typing
  }

  const handleSavePaymentOnly = async () => {
    // Basic validations
    if (!selectedRequest) {
      toast.error("No request selected.")
      return
    }

    // Require cashier name
    if (!cashier || cashier.trim() === "") {
      toast.error("Please enter cashier name.")
      return
    }

    if (!Number.isFinite(dueNow) || dueNow < 0) {
      toast.error("Please enter a valid Due Now amount (0 or greater).")
      return
    }

    if (dueNow > ((selectedRequest.remainingBalance ?? 0) + (selectedRequest.storageFee ?? 0))) {
      toast.error("Due Now cannot exceed the remaining balance (including storage fee).")
      return
    }

    if (!Number.isFinite(customerPaid) || customerPaid < 0) {
      toast.error("Please enter a valid Customer Paid amount.")
      return
    }

    if (customerPaid < dueNow) {
      toast.error("Customer paid is less than due now.")
      return
    }
    
    setIsSavingPayment(true)
    try {
      const txId = selectedRequest?.receiptId
      if (!txId) throw new Error("No selected transaction")
  const pm = modeOfPayment === 'cash' ? 'Cash' : modeOfPayment === 'gcash' ? 'GCash' : modeOfPayment === 'bank' ? 'Bank' : 'Other'

      // Compute updated payment status using post-payment totals so we can pass simple status to PDF
      const prevPaid = Number(selectedRequest?.amountPaid ?? 0)
      const totalDue = (Number(selectedRequest?.total ?? 0) + Number(selectedRequest?.storageFee ?? 0))
      const totalPaidAfter = prevPaid + Number(dueNow || 0)
      let updatedStatus = 'PARTIAL'
      if (totalPaidAfter === 0) {
        updatedStatus = 'NP'
      } else if (totalPaidAfter >= totalDue) {
        updatedStatus = 'PAID'
      } else {
        updatedStatus = 'PARTIAL'
      }

  const paymentSimple = updatedStatus === 'PAID' ? 'full' : updatedStatus === 'NP' ? 'no' : 'partial'
  // When saving payment only, the items are not being marked as picked up.

      // Create payment record (if dueNow > 0), get its id, export receipt PDF, then perform DB updates
      let createdPaymentId: string | null = null
      let createdPaymentObj: { payment_id: string; payment_amount: number; payment_mode?: string; payment_date?: string } | null = null
      try {
        if (dueNow && dueNow > 0) {
          const { createPayment } = await import("@/utils/api/createPayment")
          const branch_id = sessionStorage.getItem("branch_id") || undefined
          const created = await createPayment({ transaction_id: txId, payment_amount: dueNow, payment_mode: pm, branch_id })
          createdPaymentId = created?.payment_id || null
          if (created && created.payment_id) {
            createdPaymentObj = {
              payment_id: created.payment_id,
              payment_amount: created.payment_amount,
              payment_mode: created.payment_mode,
              payment_date: created.payment_date || new Date().toISOString(),
            }
          }
        }
      } catch (e) {
        console.debug('Failed to create payment before export (continuing):', e)
        // Continue: export and applyPayment will still run; server-side applyPayment may also create a payment
      }

      // Build payments list for applyPayment and PDF export prior to exporting
      let paymentsForPdf: Array<{ payment_id: string; payment_amount: number; payment_mode?: string; payment_date?: string }> = []
      try {
        const existingPaymentIds = selectedRequest?.payments || []
        if (existingPaymentIds && existingPaymentIds.length > 0) {
          const { getPaymentById } = await import("@/utils/api/getPaymentById")
          const promises = existingPaymentIds.map((pid) => getPaymentById(String(pid)).catch((e) => {
            console.debug('Failed to load payment', pid, e)
            return null
          }))
          const results = await Promise.all(promises)
          paymentsForPdf = results.filter(Boolean).map((p: any) => ({
            payment_id: p.payment_id,
            payment_amount: p.payment_amount,
            payment_mode: p.payment_mode,
            payment_date: p.payment_date,
          }))
        }
      } catch (e) {
        console.debug('Failed to preload payments for PDF export', e)
      }

      // include created payment if present and not already included
      if (createdPaymentObj) {
        const exists = paymentsForPdf.some((p) => p.payment_id === createdPaymentObj!.payment_id)
        if (!exists) paymentsForPdf.push(createdPaymentObj)
      }

      // sort by payment_date ascending (missing dates go last)
      paymentsForPdf.sort((a, b) => {
        const ta = a.payment_date ? new Date(a.payment_date).getTime() : Number.POSITIVE_INFINITY
        const tb = b.payment_date ? new Date(b.payment_date).getTime() : Number.POSITIVE_INFINITY
        return ta - tb
      })

      // Export receipt PDF before performing DB updates
      try {
        const branch = sessionStorage.getItem("branch_name") || sessionStorage.getItem("branch_id") || "Branch"

        const pdfShoes = (selectedRequest?.shoes || []).map((shoe) => {
          const counts = new Map<string, number>()
          for (const s of shoe.services || []) counts.set(s, (counts.get(s) || 0) + 1)
          const servicesArr = Array.from(counts.entries()).map(([name, qty]) => ({
            service_name: name,
            quantity: qty,
            service_base_price: findServicePriceFromList(name),
          }))
          return {
            model: shoe.model,
            services: servicesArr,
            additionals: [],
            rush: shoe.rush === "yes" ? true : false,
            rushFee: shoe.rush === "yes" ? RUSH_FEE : 0,
            subtotal: servicesArr.reduce((s: number, it: any) => s + (it.service_base_price || 0) * (it.quantity || 1), 0) + (shoe.rush === "yes" ? RUSH_FEE : 0),
          }
        })

        const storageFeeUI = Number(selectedRequest?.storageFee ?? 0)
        const prevBalance = Math.max(0, (Number(selectedRequest?.total ?? 0) - Number(selectedRequest?.amountPaid ?? 0)) + storageFeeUI)
        const newBalance = Math.max(0, prevBalance - Number(dueNow || 0))

        // acknowledgement text intentionally omitted from printed receipt

        // Use the paymentsForPdf we already built above (preload + include createdPaymentObj + sort)

        const pdfData = {
          transaction_id: txId,
          cust_name: selectedRequest?.customerName || "",
          cust_id: selectedRequest?.customerId || "",
          cust_address: selectedRequest?.customerAddress || "",
          date: new Date().toISOString(),
          date_in: selectedRequest?.dateIn || "",
          date_out: null,
          received_by: cashier || "",
          payment_mode: pm,
          discountAmount: selectedRequest?.discount ?? 0,
          total_amount: selectedRequest?.total ?? 0,
          payment: dueNow,
          amount_paid: Number(selectedRequest?.amountPaid ?? 0) + Number(dueNow || 0),
          change: Math.max(0, customerPaid - dueNow),
          prev_balance: prevBalance,
          storageFee: storageFeeUI,
          dueNow: dueNow,
          customerPaid: customerPaid,
          new_balance: newBalance,
          payment_status_simple: paymentSimple,
          uiSummary: {
            cashier: cashier || "",
            dueNow: dueNow,
            customerPaid: customerPaid,
            change: Math.max(0, customerPaid - dueNow),
            updatedBalance: Math.max(0, newBalance),
            updatedStatus: getUpdatedStatus(Number(selectedRequest?.amountPaid ?? 0), Number(dueNow || 0), Number(selectedRequest?.total ?? 0), Number(selectedRequest?.storageFee ?? 0)),
            storageFee: storageFeeUI,
          },
          shoes: pdfShoes,
       // include the latest created payment id for printing (optional)
       latest_payment_id: createdPaymentId,
       // include full payments list (ids and amounts) in date ascending order
       payments: paymentsForPdf.length > 0 ? paymentsForPdf : undefined,
        }

        await exportReceiptPDF({ type: 'acknowledgement-receipt', data: pdfData, branch })
      } catch (e) {
        console.debug('Pre-save export failed (continuing to save):', e)
        toast.error('Failed to export receipt before saving. The payment will still be saved.')
      }

      await applyPayment(txId, {
        dueNow,
        customerPaid,
        modeOfPayment: pm,
        markPickedUp: false,
        payment_status: updatedStatus,
        // allow server to know if a payment record was pre-created (server will ensure no duplicates)
        provided_payment_id: createdPaymentId ?? undefined,
        // pass full payments list (ids + amounts) in date ascending order as helper for server-side record
        provided_payments_list: paymentsForPdf.length > 0 ? paymentsForPdf : undefined,
      })

  // refresh transaction data
  const refreshed = await getTransactionById(txId)
    if (refreshed && refreshed.transaction) {
        const transaction = refreshed.transaction
        // recompute storage fee from refreshed.lineItems using helper
        let refreshedStorageFee = selectedRequest?.storageFee ?? 0
        try {
          refreshedStorageFee = computeStorageFeeFromLineItems(refreshed.lineItems)
        } catch (e) {
          /* ignore */
        }

        const updatedReq = {
          ...selectedRequest,
          total: transaction.total_amount,
          amountPaid: transaction.amount_paid,
          remainingBalance: Math.max(0, transaction.total_amount - transaction.amount_paid),
          // keep discount as-is from transaction
          discount: transaction.discount_amount ?? selectedRequest?.discount ?? null,
          storageFee: refreshedStorageFee,
          // include up-to-date payments ids from transaction so next exports see them
          payments: Array.isArray(transaction.payments) ? transaction.payments : [],
        }
        setSelectedRequest(updatedReq)
        // also update fetchedRequests list
        setFetchedRequests((prev) => prev.map((r) => (r.receiptId === txId ? updatedReq : r)))
        // update updatedBalance in UI to include storage fee
        setUpdatedBalance(Math.max(0, (updatedReq.remainingBalance ?? 0) + (updatedReq.storageFee ?? 0)))

        // refresh payments list for UI
        try {
          await loadPaymentsForTransaction(refreshed.transaction.payments)
        } catch (e) {
          /* ignore */
        }

        // If transaction overpaid, update storage_fee on line items accordingly
        try {
          // compute overflow using previous amountPaid + dueNow (the new payment amount)
          const prevPaid = Number(selectedRequest?.amountPaid ?? 0)
          const totalAmt = Number(transaction.total_amount ?? selectedRequest?.total ?? 0)
          const overflow = Math.max(0, (prevPaid + dueNow) - totalAmt)
          if (overflow > 0) {
            const refreshedLineItems = refreshed.lineItems || []
            if (selectedLineItemId) {
              // apply entire overflow to selected line item
              await updateLineItemStorageFee(selectedLineItemId, overflow)
            } else if (refreshedLineItems.length > 0) {
              // distribute equally among line items
              const per = Math.floor((overflow / refreshedLineItems.length) * 100) / 100
              await Promise.all(refreshedLineItems.map((li: any) => updateLineItemStorageFee(li.line_item_id, per)))
            }

            // After applying DB updates to line items, refetch transaction to get updated stored storage_fee values
              try {
                const afterUpdate = await getTransactionById(txId)
                const newRemainingSf = computeStorageFeeFromLineItems(afterUpdate.lineItems || [])

                const updatedReqAfter = {
                  ...updatedReq,
                  total: afterUpdate.transaction.total_amount,
                  amountPaid: afterUpdate.transaction.amount_paid,
                  remainingBalance: Math.max(0, afterUpdate.transaction.total_amount - afterUpdate.transaction.amount_paid),
                  storageFee: newRemainingSf,
                  payments: Array.isArray(afterUpdate.transaction.payments) ? afterUpdate.transaction.payments : [],
                }
                setSelectedRequest(updatedReqAfter)
                setFetchedRequests((prev) => prev.map((r) => (r.receiptId === txId ? updatedReqAfter : r)))
                setUpdatedBalance(Math.max(0, (updatedReqAfter.remainingBalance ?? 0) + (updatedReqAfter.storageFee ?? 0)))
              } catch (e) {
                console.debug('Failed to refresh transaction after updating line item storage fees', e)
              }
          }
        } catch (e) {
          console.debug('Failed to update line item storage fees after payment', e)
        }
      }

      // removed post-update export: we exported the receipt before saving to DB

      toast.success("Payment saved successfully!")
      setIsPaymentModalOpen(false)
      
      // Clear payment fields after successful save
      clearPaymentFields();
      // Deselect current selection so UI reflects updated data and awaits fresh selection
      setSelectedRequest(null)
      setSelectedLineItemId(null)
    } catch (err) {
      console.error(err)
      toast.error(`Failed to save payment: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsSavingPayment(false)
    }
  }

  const handleConfirmPayment = async () => {
    // Basic validations
    if (!selectedRequest) {
      toast.error("No request selected.")
      return
    }

    // Require cashier name
    if (!cashier || cashier.trim() === "") {
      toast.error("Please enter cashier name.")
      return
    }

    // Allow dueNow to be zero unless this is the last pair and not fully paid
    if (!Number.isFinite(dueNow) || dueNow < 0) {
      toast.error("Please enter a valid Due Now amount (0 or greater).")
      return
    }

    if (dueNow > ((selectedRequest.remainingBalance ?? 0) + (selectedRequest.storageFee ?? 0))) {
      toast.error("Due Now cannot exceed the remaining balance (including storage fee).")
      return
    }

    if (!Number.isFinite(customerPaid) || customerPaid < 0) {
      toast.error("Please enter a valid Customer Paid amount.")
      return
    }

    if (customerPaid < dueNow) {
      toast.error("Customer paid is less than due now.")
      return
    }
    // Prevent marking as Picked Up when only one unreleased pair remains but payment is not fully covered
    const remainingPairs = (selectedRequest.pairs || 0) - (selectedRequest.pairsReleased || 0)
    if (remainingPairs === 1) {
      const postPaymentRemaining = ((selectedRequest.remainingBalance || 0) + (selectedRequest.storageFee ?? 0)) - dueNow
      if (postPaymentRemaining > 0) {
        // Last pair and still unpaid after this payment attempt -> require payment
        toast.error("Cannot mark as Picked Up: the remaining balance must be fully paid before picking up the last pair.")
        return
      }
    }

    // If marking a single line item as picked up and there are multiple remaining pairs,
    // require the user to select a specific line item to avoid ambiguity.
    if (!paymentOnly && remainingPairs > 1 && !selectedLineItemId) {
      toast.error("Multiple pairs are still pending. Select the specific pair (row) to mark as picked up.")
      return
    }

    // If we are marking a specific line item as picked up, ensure its current status
    // is 'Ready fo Pickup' (exact string) before allowing pickup. If not, inform user.
    if (!paymentOnly && selectedLineItemId && selectedRequest) {
      const selectedShoe = selectedRequest.shoes.find((s: any) => (s as any).lineItemId === selectedLineItemId)
  const status = selectedShoe?.currentStatus || null
      if (status && status !== "Ready for Pickup") {
        toast.error(`${status} cannot be marked as Picked Up.`)
        return
      }
    }
    
    setIsConfirmingPayment(true)
    try {
      const txId = selectedRequest?.receiptId
      if (!txId) throw new Error("No selected transaction")
  const pm = modeOfPayment === 'cash' ? 'Cash' : modeOfPayment === 'gcash' ? 'GCash' : modeOfPayment === 'bank' ? 'Bank' : 'Other'
      // Compute updated payment status for confirm action using same consistent rules
      const prevPaidC = Number(selectedRequest?.amountPaid ?? 0)
      const totalDueC = (Number(selectedRequest?.total ?? 0) + Number(selectedRequest?.storageFee ?? 0))
      const totalPaidAfterC = prevPaidC + Number(dueNow || 0)
      let updatedStatusC = 'PARTIAL'
      if (totalPaidAfterC === 0) {
        updatedStatusC = 'NP'
      } else if (totalPaidAfterC >= totalDueC) {
        updatedStatusC = 'PAID'
      } else {
        updatedStatusC = 'PARTIAL'
      }

      // Create payment record (if dueNow > 0), then export PDF and confirm
      let createdPaymentIdC: string | null = null
      try {
        if (dueNow && dueNow > 0) {
          const { createPayment } = await import("@/utils/api/createPayment")
          const branch_id = sessionStorage.getItem("branch_id") || undefined
          const created = await createPayment({ transaction_id: txId, payment_amount: dueNow, payment_mode: pm, branch_id })
          createdPaymentIdC = created?.payment_id || null
        }
      } catch (e) {
        console.debug('Failed to create payment before export (continuing):', e)
      }

  // Build payments list for PDF/export and for applyPayment payload (declare before try so it's in scope below)
  let paymentsForPdfC: Array<{ payment_id: string; payment_amount: number; payment_mode?: string; payment_date?: string }> = []
  // Build and export PDF before confirm (include simplified payment status and acknowledgement text)
  try {
        const paymentSimple = updatedStatusC === 'PAID' ? 'full' : updatedStatusC === 'NP' ? 'no' : 'partial'
  // In the confirm flow we are marking items as picked up.
        // acknowledgement text intentionally omitted from printed receipt

        const branch = sessionStorage.getItem("branch_name") || sessionStorage.getItem("branch_id") || "Branch"
        const pdfShoes = (selectedRequest?.shoes || []).map((shoe) => {
          const counts = new Map<string, number>()
          for (const s of shoe.services || []) counts.set(s, (counts.get(s) || 0) + 1)
          const servicesArr = Array.from(counts.entries()).map(([name, qty]) => ({
            service_name: name,
            quantity: qty,
            service_base_price: findServicePriceFromList(name),
          }))
          return {
            model: shoe.model,
            services: servicesArr,
            additionals: [],
            rush: shoe.rush === "yes" ? true : false,
            rushFee: shoe.rush === "yes" ? RUSH_FEE : 0,
            subtotal: servicesArr.reduce((s: number, it: any) => s + (it.service_base_price || 0) * (it.quantity || 1), 0) + (shoe.rush === "yes" ? RUSH_FEE : 0),
          }
        })

        const storageFeeUI = Number(selectedRequest?.storageFee ?? 0)
        const prevBalance = Math.max(0, (Number(selectedRequest?.total ?? 0) - Number(selectedRequest?.amountPaid ?? 0)) + storageFeeUI)
        const newBalance = Math.max(0, prevBalance - Number(dueNow || 0))

        try {
          const existingPaymentIds = selectedRequest?.payments || []
          if (existingPaymentIds && existingPaymentIds.length > 0) {
            const { getPaymentById } = await import("@/utils/api/getPaymentById")
            const promises = existingPaymentIds.map((pid) => getPaymentById(String(pid)).catch((e) => {
              console.debug('Failed to load payment', pid, e)
              return null
            }))
            const results = await Promise.all(promises)
            paymentsForPdfC = results.filter(Boolean).map((p: any) => ({
              payment_id: p.payment_id,
              payment_amount: p.payment_amount,
              payment_mode: p.payment_mode,
              payment_date: p.payment_date,
            }))
          }
        } catch (e) {
          console.debug('Failed to preload payments for PDF export (confirm)', e)
        }

        // include created payment if present and not already included
        if (createdPaymentIdC) {
          const createdObj = {
            payment_id: createdPaymentIdC,
            payment_amount: dueNow,
            payment_mode: pm,
            payment_date: new Date().toISOString(),
          }
          const exists = paymentsForPdfC.some((p) => p.payment_id === createdObj.payment_id)
          if (!exists) paymentsForPdfC.push(createdObj)
        }

        // sort by payment_date ascending
        paymentsForPdfC.sort((a, b) => {
          const ta = a.payment_date ? new Date(a.payment_date).getTime() : Number.POSITIVE_INFINITY
          const tb = b.payment_date ? new Date(b.payment_date).getTime() : Number.POSITIVE_INFINITY
          return ta - tb
        })

        const pdfData = {
          transaction_id: txId,
          cust_name: selectedRequest?.customerName || "",
          cust_id: selectedRequest?.customerId || "",
          cust_address: selectedRequest?.customerAddress || "",
          date: new Date().toISOString(),
          date_in: selectedRequest?.dateIn || "",
          date_out: null,
          received_by: cashier || "",
          payment_mode: pm,
          discountAmount: selectedRequest?.discount ?? 0,
          total_amount: selectedRequest?.total ?? 0,
          payment: dueNow,
          amount_paid: Number(selectedRequest?.amountPaid ?? 0) + Number(dueNow || 0),
          change: Math.max(0, customerPaid - dueNow),
          prev_balance: prevBalance,
          storageFee: storageFeeUI,
          dueNow: dueNow,
          customerPaid: customerPaid,
          new_balance: newBalance,
          payment_status_simple: paymentSimple,
          uiSummary: {
            cashier: cashier || "",
            dueNow: dueNow,
            customerPaid: customerPaid,
            change: Math.max(0, customerPaid - dueNow),
            updatedBalance: Math.max(0, newBalance),
            updatedStatus: getUpdatedStatus(Number(selectedRequest?.amountPaid ?? 0), Number(dueNow || 0), Number(selectedRequest?.total ?? 0), Number(selectedRequest?.storageFee ?? 0)),
            storageFee: storageFeeUI,
          },
          shoes: pdfShoes,
          latest_payment_id: createdPaymentIdC,
          payments: paymentsForPdfC.length > 0 ? paymentsForPdfC : undefined,
        }

        await exportReceiptPDF({ type: 'acknowledgement-receipt', data: pdfData, branch })
      } catch (e) {
        console.debug('Pre-confirm export failed (continuing to confirm):', e)
        toast.error('Failed to export receipt before confirming. The payment will still be saved and pickup processed.')
      }

      await applyPayment(txId, {
        dueNow,
        customerPaid,
        modeOfPayment: pm,
        lineItemId: selectedLineItemId ?? undefined,
        markPickedUp: true,
        payment_status: updatedStatusC,
        provided_payment_id: createdPaymentIdC ?? undefined,
        // pass full payments list (ids + amounts) in date ascending order as helper for server-side record
        provided_payments_list: paymentsForPdfC.length > 0 ? paymentsForPdfC : undefined,
      })

  // refresh transaction data
  const refreshed = await getTransactionById(txId)
  if (refreshed && refreshed.transaction) {
        const transaction = refreshed.transaction
        // Compute remaining storage fee owed after accounting for any existing stored storage_fee
        let refreshedStorageFee = selectedRequest?.storageFee ?? 0
        try {
          refreshedStorageFee = computeStorageFeeFromLineItems(refreshed.lineItems || [])
        } catch (e) {
          /* ignore */
        }

        const updatedReq = {
          ...selectedRequest,
          total: transaction.total_amount,
          amountPaid: transaction.amount_paid,
          remainingBalance: Math.max(0, transaction.total_amount - transaction.amount_paid),
          discount: transaction.discount_amount ?? selectedRequest?.discount ?? null,
          storageFee: refreshedStorageFee,
          payments: Array.isArray(transaction.payments) ? transaction.payments : [],
        }
        setSelectedRequest(updatedReq)
        setFetchedRequests((prev) => prev.map((r) => (r.receiptId === txId ? updatedReq : r)))
        setUpdatedBalance(Math.max(0, (updatedReq.remainingBalance ?? 0) + (updatedReq.storageFee ?? 0)))

        // If transaction overpaid, update storage_fee on line items accordingly
        try {
          const prevPaid = Number(selectedRequest?.amountPaid ?? 0)
          const totalAmt = Number(transaction.total_amount ?? selectedRequest?.total ?? 0)
          const overflow = Math.max(0, (prevPaid + dueNow) - totalAmt)
          if (overflow > 0) {
            const refreshedLineItems = refreshed.lineItems || []
            if (selectedLineItemId) {
              await updateLineItemStorageFee(selectedLineItemId, overflow)
            } else if (refreshedLineItems.length > 0) {
              const per = Math.floor((overflow / refreshedLineItems.length) * 100) / 100
              await Promise.all(refreshedLineItems.map((li: any) => updateLineItemStorageFee(li.line_item_id, per)))
            }

            // After applying DB updates to line items, refetch transaction to get updated stored storage_fee values
              try {
                const afterUpdate = await getTransactionById(txId)
                const newRemainingSf = computeStorageFeeFromLineItems(afterUpdate.lineItems || [])

                const updatedReqAfter = {
                  ...updatedReq,
                  total: afterUpdate.transaction.total_amount,
                  amountPaid: afterUpdate.transaction.amount_paid,
                  remainingBalance: Math.max(0, afterUpdate.transaction.total_amount - afterUpdate.transaction.amount_paid),
                  storageFee: newRemainingSf,
                  payments: Array.isArray(afterUpdate.transaction.payments) ? afterUpdate.transaction.payments : [],
                }
                setSelectedRequest(updatedReqAfter)
                setFetchedRequests((prev) => prev.map((r) => (r.receiptId === txId ? updatedReqAfter : r)))
                setUpdatedBalance(Math.max(0, (updatedReqAfter.remainingBalance ?? 0) + (updatedReqAfter.storageFee ?? 0)))
              } catch (e) {
                console.debug('Failed to refresh transaction after updating line item storage fees', e)
              }
          }
        } catch (e) {
          console.debug('Failed to update line item storage fees after confirm', e)
        }
      }

      // refresh payments list for UI after confirm
      try {
        await loadPaymentsForTransaction(refreshed.transaction.payments)
      } catch (e) {
        /* ignore */
      }

      // removed post-update export: we already exported the receipt before confirming

      toast.success("Payment updated & marked as picked up!")
      setIsPaymentModalOpen(false)
      
      // Clear payment fields after successful confirm
      clearPaymentFields();
      // Deselect after marking picked up so removed row doesn't stay highlighted
      setSelectedRequest(null)
      setSelectedLineItemId(null)
      // Local removal workaround (no socket): remove picked up line item from table immediately
      if (selectedRequest && selectedLineItemId) {
        setFetchedRequests(prev => {
          const updated = prev.map(r => {
            if (r.receiptId !== selectedRequest.receiptId) return r
            const remainingShoes = r.shoes.filter(s => s.lineItemId !== selectedLineItemId)
            if (remainingShoes.length === 0) {
              return { ...r, shoes: remainingShoes }
            }
            return { ...r, shoes: remainingShoes, pairsReleased: (r.pairsReleased + 1) }
          }).filter(r => r.shoes.length > 0)
          return updated
        })
      }
    } catch (err) {
      console.error(err)
      toast.error(`Failed to confirm payment: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsConfirmingPayment(false)
    }
  }

  // Validation is performed at save/confirm time via toast messages. Keep inputs permissive in the UI.


  // Removed diagnostic state / effects

  const receiptTotalDue = selectedRequest ? Number(selectedRequest.total ?? 0) + Number(selectedRequest.storageFee ?? 0) : 0
  const receiptBalance = selectedRequest ? Number(selectedRequest.remainingBalance ?? 0) + Number(selectedRequest.storageFee ?? 0) : 0
  const receiptPaidAfter = selectedRequest ? Number(selectedRequest.amountPaid ?? 0) + Number(dueNow || 0) : 0
  const receiptStatus = !selectedRequest
    ? 'NP'
    : receiptPaidAfter === 0
      ? 'NP'
      : receiptPaidAfter >= receiptTotalDue
        ? 'PAID'
        : 'PARTIAL'

  return (
    <div className="payment-container">
      {/* Left: Options card + Table card */}
      <div className="payment-form-container">
        <div className="payment-form">
          {/* Card 1: Search / sort options — matches Central View's filters panel */}
          <Card className="payment-options-card">
            <CardContent className="payment-options-content">
              <div className="payment-header-row">
                <div>
                  <h1>Update Payment</h1>
                  <p className="payment-header-subtitle">Search and manage pending balances</p>
                </div>
              </div>

              <div className="payment-filter-pair flex items-end">
                <div className="w-[45%]">
                  <SearchBar value={searchQuery} onChange={(val) => setSearchQuery(val)} />
                </div>
                <div className="w-[30%]">
                  <Select value={sortBy} onValueChange={(val) => setSortBy(val as any)}>
                    <SelectTrigger id="branch" className="payment-sort-trigger">
                      <SelectValue placeholder="Sort by Date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">None</SelectItem>
                      <SelectItem value="receiptId">Transaction ID</SelectItem>
                      <SelectItem value="pairs"># Pairs</SelectItem>
                      <SelectItem value="customerName">Customer Name</SelectItem>
                      <SelectItem value="total">Total Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <RadioGroup
                  value={sortOrder}
                  onValueChange={(val) => setSortOrder(val as "Ascending" | "Descending")}
                  className="flex flex-row gap-4 mb-[10px]"
                >
                  <div className="radio-option">
                    <RadioGroupItem value="Ascending" />
                    <Label>ASC</Label>
                  </div>
                  <div className="radio-option">
                    <RadioGroupItem value="Descending" />
                    <Label>DESC</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Results table — matches Central View's table shell */}
          <Card className="payment-table-card">
            <CardContent className="payment-table-content">
              <div className="payment-table">
                {loading ? (
                  <div className="p-4 text-center text-gray-600">Loading payments...</div>
                ) : filteredRequests.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="mb-2">No payment requests found</div>
                    <div className="text-sm">
                      {fetchedRequests.length === 0 
                        ? "There are no pending transactions in the system."
                        : "Try adjusting your search criteria."}
                    </div>
                  </div>
                ) : (
                    <PaymentsTable
                    requests={filteredRequests}
                    selectedRequest={selectedRequest}
                    selectedLineItemId={selectedLineItemId}
                    onSelect={(req: Request | null, lineItemId?: string | null) => {
                      // If req is null -> deselect everything
                      console.debug('Payments page: onSelect called ->', { reqReceipt: req?.receiptId, lineItemId })
                      try {
                        console.debug('Payments page: previous selectedRequest=', selectedRequest?.receiptId, 'selectedLineItemId=', selectedLineItemId)
                      } catch (e) {}
                      if (!req) {
                        setSelectedRequest(null)
                        setSelectedLineItemId(null)
                        // reset payment inputs
                        setDueNow(0)
                        setCustomerPaid(0)
                        setChange(0)
                        setUpdatedBalance(0)
                        return
                      }

                      // Select the passed request and line-item id (may be null)
                      setSelectedRequest(req)
                      // load payment details for this request (if any)
                      loadPaymentsForTransaction(req?.payments)
                      setSelectedLineItemId(lineItemId ?? null)

                      // Reset payment inputs to zero on selection. Do NOT prefill any amounts.
                      setDueNow(0)
                      setCustomerPaid(0)
                      setChange(0)
                      setUpdatedBalance((req.remainingBalance ?? 0) + (req.storageFee ?? 0))
                    }}
                    findServicePrice={findServicePriceFromList}
                    formatCurrency={formatCurrency}
                    RUSH_FEE={RUSH_FEE}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right: Request Summary — unchanged */}
<div className="payment-receipt-panel">
  <div className="payment-receipt-card">
    <div className="payment-receipt-content">
      <div className="payment-receipt-header">
        <h1>Request Summary</h1>
        <div className="payment-receipt-accent-bar" />
      </div>

      {selectedRequest ? (
        <div className="payment-receipt-body">
          {/* Customer */}
          <div className="payment-receipt-section">
            <p className="payment-receipt-section-label">Customer</p>
            <div className="payment-receipt-two-col">
              <div>
                <p className="payment-receipt-meta-label">Customer ID</p>
                <p className="payment-receipt-meta-value">#{selectedRequest.customerId}</p>
              </div>
              <div>
                <p className="payment-receipt-meta-label">Customer Name</p>
                <p className="payment-receipt-meta-value">{selectedRequest.customerName}</p>
              </div>
            </div>
          </div>

          <hr className="payment-receipt-divider" />

          {/* Service Request */}
          <div className="payment-receipt-section">
            <div className="payment-receipt-section-head">
              <p className="payment-receipt-section-label">Service Request</p>
              <p className="payment-receipt-section-date">{selectedRequest.dateIn}</p>
            </div>

            <div className="payment-receipt-items">
              {selectedRequest.shoes.map((shoe, i) => {
                const counts = new Map<string, number>()
                for (const s of shoe.services || []) counts.set(s, (counts.get(s) || 0) + 1)
                const serviceEntries = Array.from(counts.entries())
                const shoeTotal =
                  serviceEntries.reduce(
                    (sum, [name, qty]) => sum + findServicePriceFromList(name) * qty,
                    0
                  ) + (shoe.rush === "yes" ? RUSH_FEE : 0)

                return (
                  <div className="payment-receipt-item" key={i}>
                    <div className="payment-receipt-item-info">
                      <p className="payment-receipt-item-name">{shoe.model || "Unnamed Shoe"}</p>
                      {serviceEntries.map(([srv, qty], idx) => (
                        <p key={idx} className="payment-receipt-item-service">
                          {srv.toUpperCase()}
                          {qty > 1 ? ` x${qty}` : ""}
                        </p>
                      ))}
                      {shoe.rush === "yes" && (
                        <p className="payment-receipt-item-service payment-receipt-item-rush">
                          RUSH SERVICE
                        </p>
                      )}
                    </div>
                    <p className="payment-receipt-item-price">{formatCurrency(shoeTotal)}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <hr className="payment-receipt-divider" />

          {/* Totals */}
          <div className="payment-receipt-totals">
            <div className="payment-receipt-row">
              <p>Total Amount</p>
              <p className="payment-receipt-value-strong">{formatCurrency(selectedRequest.total)}</p>
            </div>

            <div className="payment-receipt-row">
              <p>Discount</p>
              <p className="payment-receipt-value-muted">
                ({formatCurrency(selectedRequest.discount ?? 0)})
              </p>
            </div>

            <div className="payment-receipt-row">
              <p>Amount Paid</p>
              <p className="payment-receipt-value-green">
                ({formatCurrency(selectedRequest.amountPaid)})
              </p>
            </div>

            {(selectedRequest.storageFee ?? 0) > 0 && (
              <div className="payment-receipt-row">
                <p>Storage Fee</p>
                <p className="payment-receipt-value-red">{formatCurrency(selectedRequest.storageFee ?? 0)}</p>
              </div>
            )}
          </div>

          <hr className="payment-receipt-divider" />

          <div className="payment-receipt-balance-block">
            <p className="payment-receipt-balance-label">Balance</p>
            <p className="payment-receipt-balance-value">{formatCurrency(receiptBalance)}</p>
          </div>

          <div className="payment-receipt-newpaid-box">
            <p className="payment-receipt-meta-label">New Amount Paid</p>
            <p className="payment-receipt-newpaid-value">({formatCurrency(dueNow)})</p>
          </div>
        </div>
      ) : (
        <div className="payment-receipt-empty">
          <p className="payment-receipt-empty-title">No request selected</p>
          <p className="payment-receipt-empty-copy">Select a request to preview the receipt summary.</p>
        </div>
      )}

      <hr className="payment-receipt-divider" />

      {selectedRequest && (
        <div className="payment-receipt-footer">
          <div className="payment-receipt-footer-grid">
            <div className="payment-receipt-footer-card">
              <p className="payment-receipt-footer-label">Updated Balance</p>
              <p className="payment-receipt-footer-value">{formatCurrency(updatedBalance)}</p>
            </div>
            <div className="payment-receipt-footer-card payment-receipt-footer-card-status">
              <p className="payment-receipt-footer-label">Updated Status</p>
              <p
                className={
                  "payment-receipt-footer-value " +
                  (receiptStatus === "PAID"
                    ? "payment-receipt-status-paid"
                    : receiptStatus === "PARTIAL"
                    ? "payment-receipt-status-partial"
                    : "payment-receipt-status-np")
                }
              >
                {receiptStatus}
              </p>
            </div>
          </div>

          <Button
            className="w-full p-5 mt-0 rounded-xl bg-[#DC2626] payment-receipt-action"
            onClick={() => setIsPaymentModalOpen(true)}
          >
            Open Payment Modal
            <i className="bi-check-circle"></i>
          </Button>
        </div>
      )}
    </div>
  </div>
</div>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="payment-modal-content">
          <DialogHeader className="payment-modal-header">
            <div>
              <DialogTitle>Update Payment</DialogTitle>
              <DialogDescription>
                Review the remaining balance, choose the payment mode, and finalize this transaction.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="payment-modal-body">
            <div className="payment-modal-column payment-modal-left">
              <div className="payment-modal-field">
                <Label>Cashier</Label>
                <Input value={cashier} readOnly placeholder="Cashier name" />
              </div>

              <div className="payment-modal-field">
                <Label>Mode of Payment</Label>
                <RadioGroup
                  value={modeOfPayment}
                  onValueChange={(val) => setModeOfPayment(val as 'cash' | 'gcash' | 'bank' | 'other')}
                  className="payment-modal-radio-group"
                >
                  <div className="radio-option">
                    <RadioGroupItem value="cash" id="payment-cash" />
                    <Label htmlFor="payment-cash" className="radio-inline-label">Cash</Label>
                  </div>
                  <div className="radio-option">
                    <RadioGroupItem value="gcash" id="payment-gcash" />
                    <Label htmlFor="payment-gcash" className="radio-inline-label">GCash</Label>
                  </div>
                  <div className="radio-option">
                    <RadioGroupItem value="bank" id="payment-bank" />
                    <Label htmlFor="payment-bank" className="radio-inline-label">Bank</Label>
                  </div>
                  <div className="radio-option">
                    <RadioGroupItem value="other" id="payment-other" />
                    <Label htmlFor="payment-other" className="radio-inline-label">Other</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="payment-modal-field payment-modal-remaining">
                <Label>Remaining Balance</Label>
                <div className="payment-modal-remaining-value">
                  {formatCurrency((selectedRequest?.remainingBalance ?? 0) + (selectedRequest?.storageFee ?? 0))}
                </div>
              </div>
            </div>

            <div className="payment-modal-column payment-modal-right">
              <div className="payment-modal-grid">
                <div>
                  <p className="payment-modal-meta-label">Due Now</p>
                  <Input
                    type="number"
                    className="text-right"
                    value={dueNow}
                    onChange={(e) => handleDueNow(Number(e.target.value) || 0)}
                    max={selectedRequest ? ((selectedRequest.remainingBalance ?? 0) + (selectedRequest.storageFee ?? 0)) : undefined}
                    min={0}
                  />
                </div>

                <div>
                  <p className="payment-modal-meta-label">Customer Paid</p>
                  <Input
                    type="number"
                    className="text-right"
                    value={customerPaid}
                    onChange={(e) => handleCustomerPaid(Number(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <p className="payment-modal-meta-label">Change</p>
                  <div className="payment-modal-value">{formatCurrency(change)}</div>
                </div>

                <div>
                  <p className="payment-modal-meta-label">Updated Balance</p>
                  <div className="payment-modal-value">{formatCurrency(updatedBalance)}</div>
                </div>
              </div>

              <div className="payment-modal-status-row">
                <span className="payment-modal-status-label">Updated Status</span>
                <span className={`payment-modal-status-pill payment-modal-status-${receiptStatus.toLowerCase()}`}>
                  {receiptStatus}
                </span>
              </div>

              <div className="payment-modal-toggle-row">
                <Checkbox
                  id="payment-only-modal"
                  checked={paymentOnly}
                  onCheckedChange={(checked) => setPaymentOnly(!!checked)}
                />
                <Label htmlFor="payment-only-modal">Payment only</Label>
              </div>
            </div>
          </div>

          <DialogFooter className="payment-modal-footer">
            <Button type="button" variant="outline" className="payment-modal-cancel" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="payment-modal-confirm"
              disabled={isSavingPayment || isConfirmingPayment}
              onClick={async () => {
                if (paymentOnly) {
                  await handleSavePaymentOnly()
                } else {
                  await handleConfirmPayment()
                }
              }}
            >
              {isSavingPayment || isConfirmingPayment ? 'Processing...' : paymentOnly ? 'Save Payment' : 'Update Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
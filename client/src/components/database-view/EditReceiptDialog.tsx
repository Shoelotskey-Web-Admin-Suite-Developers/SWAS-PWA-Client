"use client"
import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Trash2, X } from "lucide-react"
import { getLineItemsByTransact } from "@/utils/api/getLineItemsByTransact" // 👈 Import the utility
import { getDatesByLineItem } from "@/utils/api/getDatesByLineItem" // 👈 Add this import
import { getCustomerById } from "@/utils/api/getCustomerById" // 👈 Import the customer fetch utility
import { updateTransaction } from "@/utils/api/updateTransaction"
import { updateLineItem } from "@/utils/api/updateLineItem"
import { updateDates } from "@/utils/api/updateDates" // 👈 Add this import
import { deleteTransaction } from "@/utils/api/deleteTransaction"
import { deleteLineItemsByTransactionId } from "@/utils/api/deleteLineItemsByTransactionId"
import { deleteDatesByLineItemId } from "@/utils/api/deleteDatesByLineItemId"
import { toast } from "sonner" // Assuming you have toast set up
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import OpBfrImg from "@/components/operations/modals/OpBfrImg";
import OpAfrImg from "@/components/operations/modals/OpAfrImg";

// ✅ Import shared types
import { ReceiptRow, Branch, TxStatusDates, PaymentStatus, Transaction} from "./central-view.types"

// Add this legend at the top of the file (or import from a shared file)
const BRANCH_LEGEND: Record<
  string,
  { branch: string; location: string }
> = {
  "VAL-B-NCR": { branch: "Valenzuela Branch", location: "Valenzuela" },
  "SMVAL-B-NCR": { branch: "SM Valenzuela Branch", location: "Valenzuela" },
  "SMGRA-B-NCR": { branch: "SM Grand Branch", location: "Caloocan" },
  "SWAS-SUPERADMIN": { branch: "Super Admin", location: "N/A" },
  "HUBV-W-NCR": { branch: "Valenzuela Hub", location: "Valenzuela City" },
}

export function EditReceiptDialog({
  open,
  onOpenChange,
  receipt,
  onReceiptUpdate, // Add this new prop
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptRow;
  onReceiptUpdate?: (updatedReceipt: ReceiptRow) => void; // Add this callback prop
}) {
  const [form, setForm] = React.useState<ReceiptRow>(receipt)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [customerLoading, setCustomerLoading] = React.useState(false)
  const [customerError, setCustomerError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false) // Add this state
  const [isDeleting, setIsDeleting] = React.useState(false) // Add this state
  const [beforeImgModal, setBeforeImgModal] = React.useState<{ open: boolean; lineItemId: string | null }>({ open: false, lineItemId: null });
  const [afterImgModal, setAfterImgModal] = React.useState<{ open: boolean; lineItemId: string | null }>({ open: false, lineItemId: null });

  // Add service ID to name mappings
  const SERVICE_ID_TO_NAME: Record<string, string> = {
    "SERVICE-1": "Basic Cleaning",
    "SERVICE-2": "Minor Reglue",
    "SERVICE-3": "Full Reglue",
    "SERVICE-4": "Unyellowing",
    "SERVICE-5": "Minor Retouch",
    "SERVICE-6": "Minor Restoration",
    "SERVICE-7": "Additional Layer",
    "SERVICE-8": "Color Renewal (2 colors)",
    "SERVICE-9": "Color Renewal (3 colors)",
  }

  const SERVICE_NAME_TO_ID: Record<string, string> = Object.entries(SERVICE_ID_TO_NAME)
    .reduce((acc, [id, name]) => ({...acc, [name]: id}), {})

  // Updated service options to match backend
  const SERVICE_OPTIONS = ["Basic Cleaning", "Minor Reglue", "Full Reglue"]
  const ADDITIONAL_OPTIONS = [
    "Unyellowing",
    "Minor Retouch",
    "Minor Restoration", 
    "Additional Layer",
    "Color Renewal (2 colors)",
    "Color Renewal (3 colors)",
  ]

  const STATUS_LABELS: Array<{ key: keyof TxStatusDates; label: string }> = [
    { key: "queued", label: "Queued" },
    { key: "readyForDelivery", label: "Ready for delivery" },
    { key: "toWarehouse", label: "To warehouse" },
    { key: "inProcess", label: "In process" },
    { key: "returnToBranch", label: "Return to branch" },
    { key: "received", label: "Received" },
    { key: "readyForPickup", label: "Ready for pickup" },
    { key: "pickedUp", label: "Picked up" },
  ]

  // Add status mapping constant (place it with other constants)
  const STATUS_TO_DB_FIELD: Record<string, string> = {
    "queued": "srm_date",
    "readyForDelivery": "rd_date",
    "toWarehouse": "ibd_date",
    "inProcess": "wh_date",
    "returnToBranch": "rb_date",
    "received": "is_date",
    "readyForPickup": "rpu_date",
    
  }

  // Add status to numeric value mapping
  const STATUS_TO_NUMBER: Record<string, number> = {
    "queued": 1,
    "readyForDelivery": 2,
    "toWarehouse": 3,
    "inProcess": 4, 
    "returnToBranch": 5,
    "received": 6,
    "readyForPickup": 7,
    "pickedUp": 8
  }

  const STATUS_TO_STRING: Record<string, string> = {
    "queued": "Queued",
    "readyForDelivery": "Ready for Delivery",
    "toWarehouse": "Incoming Branch Delivery", 
    "inProcess": "In Process",
    "returnToBranch": "Returning to Branch",
    "received": "To Pack",
    "readyForPickup": "Ready for Pickup",
    "pickedUp": "Picked Up"
  }

  // 👇 Fetch line items when dialog opens
  React.useEffect(() => {
    async function fetchLineItems() {
      if (!open || !receipt.id) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        const lineItems = await getLineItemsByTransact(receipt.id)
        
        // Map line items to Transaction format and fetch dates for each
        const transactions: Transaction[] = await Promise.all(
          lineItems.map(async (item: any) => {
            // Separate services by type
            const serviceNeeded: string[] = []
            const additional: string[] = []
            
            item.services.forEach((s: any) => {
              const serviceName = SERVICE_ID_TO_NAME[s.service_id]
              if (serviceName) {
                if (SERVICE_OPTIONS.includes(serviceName)) {
                  serviceNeeded.push(serviceName)
                } else if (ADDITIONAL_OPTIONS.includes(serviceName)) {
                  additional.push(serviceName)
                }
              }
            })

            // Initialize default statusDates
            let statusDates: TxStatusDates = {
              queued: null,
              readyForDelivery: null,
              toWarehouse: null,
              inProcess: null,
              returnToBranch: null,
              received: null,
              readyForPickup: null,
              pickedUp: null,
            }
            
            let currentStatus = ""

            try {
              // Fetch dates from backend
              const dates = await getDatesByLineItem(item.line_item_id)
              
              if (dates) {
                // Map backend date fields to frontend statusDates
                statusDates = {
                  queued: dates.srm_date ? new Date(dates.srm_date).toISOString().slice(0, 10) : null,
                  readyForDelivery: dates.rd_date ? new Date(dates.rd_date).toISOString().slice(0, 10) : null,
                  toWarehouse: dates.ibd_date ? new Date(dates.ibd_date).toISOString().slice(0, 10) : null,
                  inProcess: dates.wh_date ? new Date(dates.wh_date).toISOString().slice(0, 10) : null,
                  returnToBranch: dates.rb_date ? new Date(dates.rb_date).toISOString().slice(0, 10) : null,
                  received: dates.is_date ? new Date(dates.is_date).toISOString().slice(0, 10) : null,
                  readyForPickup: dates.rpu_date ? new Date(dates.rpu_date).toISOString().slice(0, 10) : null,
                  pickedUp: null, // Not in backend dates model
                }
                
                // Determine current status based on the most recent filled date
                const statusOrder = ['queued', 'readyForDelivery', 'toWarehouse', 'inProcess', 'returnToBranch', 'received', 'readyForPickup', 'pickedUp']
                for (let i = statusOrder.length - 1; i >= 0; i--) {
                  const key = statusOrder[i] as keyof TxStatusDates
                  if (statusDates[key]) {
                    currentStatus = key
                    break
                  }
                }
              }
            } catch (err) {
              console.warn(`Failed to fetch dates for line item ${item.line_item_id}:`, err)
              // Continue with empty dates if fetch fails
            }
            
            return {
              id: item.line_item_id,
              shoeModel: item.shoes || "Unknown model",
              serviceNeeded,
              additional,
              rush: item.priority === "Rush",
              status: currentStatus || "queued", // Default to queued if no status
              statusDates, // Use the dates fetched from backend
              beforeImage: item.before_img || null,
              afterImage: item.after_img || null
            }
          })
        )
        
        // Update form with fetched transactions
        setForm(prev => ({
          ...prev,
          transactions
        }))
      } catch (err: any) {
        console.error("Failed to fetch line items:", err)
        setError(err.message || "Failed to fetch line items")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchLineItems()
  }, [open, receipt.id])

  // 👇 Fetch customer details when dialog opens
  React.useEffect(() => {
    async function fetchCustomerDetails() {
      if (!open || !receipt.customerId) return
      
      setCustomerLoading(true)
      setCustomerError(null)
      
      try {
        const customerData = await getCustomerById(receipt.customerId)
        
        // Update form with customer details
        setForm(prev => ({
          ...prev,
          customer: customerData.cust_name, // Update displayed customer name
          customerBirthday: customerData.cust_bdate || undefined,
          address: customerData.cust_address || undefined,
          email: customerData.cust_email || undefined,
          contact: customerData.cust_contact || undefined
        }))
      } catch (err: any) {
        console.error("Failed to fetch customer details:", err)
        setCustomerError(err.message || "Failed to fetch customer details")
      } finally {
        setCustomerLoading(false)
      }
    }
    
    fetchCustomerDetails()
  }, [open, receipt.customerId])

  React.useEffect(() => {
    setForm(receipt)
  }, [receipt])

  const remainingBalance = (form?.total ?? 0) - (form?.amountPaid ?? 0)

  const fmtDateInput = (d?: Date | null) => {
    if (!d) return ""
    try {
      const date = typeof d === "string" ? new Date(d) : d
      if (Number.isNaN(date.getTime())) return ""
      return date.toISOString().slice(0, 10)
    } catch {
      return ""
    }
  }

  // Update the includesIgnoreCase function to handle service names properly
  const includesIgnoreCase = (arr: string[] | undefined, value: string) =>
    !!arr?.some((s) => s.toLowerCase().trim() === value.toLowerCase().trim())

  // Get legend info for this branch
  const branchInfo = BRANCH_LEGEND[form.branch as string] || { branch: form.branch, location: form.branchLocation }

  // Add this function to handle saving changes
  const handleSaveChanges = async () => {
    if (!form.id) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // 1. Prepare transaction update data
      const transactionUpdates = {
        received_by: form.receivedBy,
        date_in: form.dateIn?.toISOString(),
        date_out: form.dateOut?.toISOString() || null,
        total_amount: form.total,
        amount_paid: form.amountPaid,
        payment_status: form.status,
      };
      
      // 2. Update the transaction record
      await updateTransaction(form.id, transactionUpdates);
      
      // 3. Update each line item and its dates
      if (form.transactions && form.transactions.length > 0) {
        await Promise.all(
          form.transactions.map(async (tx) => {
            // Map form services back to backend format
            const services = [
              ...(tx.serviceNeeded || []).map(serviceName => ({
                service_id: SERVICE_NAME_TO_ID[serviceName] || "",
                quantity: 1
              })),
              ...(tx.additional || []).map(serviceName => ({
                service_id: SERVICE_NAME_TO_ID[serviceName] || "",
                quantity: 1
              }))
            ]
            
            // Update line item
            const lineItemUpdates = {
              shoes: tx.shoeModel,
              priority: tx.rush ? "Rush" : "Normal",
              services: services.filter(s => s.service_id),
              before_img: tx.beforeImage || null,
              after_img: tx.afterImage || null,
              current_status: STATUS_TO_STRING[tx.status],
            }
            
            await updateLineItem(tx.id, lineItemUpdates)
            
            // Update dates for this line item
            if (tx.statusDates) {
              const dateUpdates: Record<string, string | null> = {}
              
              // Map UI date values to DB field names
              Object.entries(tx.statusDates).forEach(([statusKey, dateValue]) => {
                const dbFieldName = STATUS_TO_DB_FIELD[statusKey]
                if (dbFieldName) {
                  dateUpdates[dbFieldName] = dateValue ? new Date(dateValue).toISOString() : null
                }
              })
              
              // Add current status number
              await updateDates(tx.id, {
                ...dateUpdates,
                current_status: STATUS_TO_NUMBER[tx.status] || 1
              })
            }
          })
        )
      }
      
      toast.success("Transaction and line items updated successfully")
      
      // Call the update callback with the updated receipt data
      if (onReceiptUpdate) {
        onReceiptUpdate(form);
      }
      
      onOpenChange(false); // Close dialog
    } catch (err: any) {
      console.error("Failed to save changes:", err)
      setError(err.message || "Failed to save changes")
      toast.error(err.message || "An error occurred while saving changes")
    } finally {
      setIsSaving(false);
    }
  }

  // Add this function to handle deletion
  const handleDelete = async () => {
    if (!form.id) return
    
    setIsDeleting(true)
    setError(null)
    
    try {
      // 1. Delete associated dates for each line item first
      if (form.transactions && form.transactions.length > 0) {
        await Promise.all(
          form.transactions.map(async (tx) => {
            await deleteDatesByLineItemId(tx.id);
          })
        );
      }
      
      // 2. Delete all line items for this transaction
      await deleteLineItemsByTransactionId(form.id);
      
      // 3. Finally delete the transaction itself
      await deleteTransaction(form.id);
      
      toast.success("Receipt and all related records deleted successfully")
      
      // Call the update callback with null to indicate deletion
      if (onReceiptUpdate) {
        onReceiptUpdate({...receipt, deleted: true});
      }
      
      onOpenChange(false) // Close dialog
    } catch (err: any) {
      console.error("Failed to delete receipt:", err)
      setError(err.message || "Failed to delete receipt and related records")
      toast.error(err.message || "An error occurred while deleting")
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleBeforeImageUploaded = React.useCallback((lineItemId: string, url: string) => {
    setForm((prev) => {
      if (!prev.transactions) return prev;
      const updatedTransactions = prev.transactions.map((tx) =>
        tx.id === lineItemId ? { ...tx, beforeImage: url } : tx
      );
      return { ...prev, transactions: updatedTransactions };
    });
  }, []);

  const handleAfterImageUploaded = React.useCallback((lineItemId: string, url: string) => {
    setForm((prev) => {
      if (!prev.transactions) return prev;
      const updatedTransactions = prev.transactions.map((tx) =>
        tx.id === lineItemId ? { ...tx, afterImage: url } : tx
      );
      return { ...prev, transactions: updatedTransactions };
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] mt-[50px] overflow-y-auto [&>button]:hidden">
        {/* Delete button */}
        <div className="absolute right-5 top-3 flex gap-2">
          <Button
            variant="destructive"
            size="icon"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>

        <DialogHeader className="items-start text-left">
          <DialogTitle asChild>
            <h1>Edit Receipt {form.id}</h1>
          </DialogTitle>
        </DialogHeader>

        {/* Customer Section */}
        <hr className="section-divider p-0 m-0" />
        <div>
          <h3 className="font-semibold">
            Customer
            {customerLoading && <span className="ml-2 text-muted-foreground text-sm">(Loading...)</span>}
            {customerError && <span className="ml-2 text-red-500 text-sm">(Error: {customerError})</span>}
          </h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-5">
            <div>
              <Label>Name</Label>
              <Input
                value={form.customer}
                onChange={(e) =>
                  setForm({ ...form, customer: e.target.value })
                }
                disabled
              />
            </div>
            <div>
              <Label>Birthday</Label>
              <Input
                type="date"
                value={form.customerBirthday ? form.customerBirthday.substring(0, 10) : ""}
                onChange={(e) =>
                  setForm({ ...form, customerBirthday: e.target.value })
                }
                disabled
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input 
                value={form.address ?? ""} 
                disabled 
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input 
                value={form.email ?? ""} 
                disabled 
              />
            </div>
            <div>
              <Label>Contact</Label>
              <Input 
                value={form.contact ?? ""} 
                disabled 
              />
            </div>
          </div>
        </div>

        {/* Branch Section */}
        <hr className="section-divider p-0 m-0" />
        <div>
          <h3 className="font-semibold">Branch</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-5">
            <div>
              <Label>Branch</Label>
              <Input
                value={branchInfo.branch}
                disabled
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={branchInfo.location} disabled />
            </div>
            <div>
              <Label>Received By</Label>
              <Input
                value={form.receivedBy}
                onChange={(e) =>
                  setForm({ ...form, receivedBy: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Date In</Label>
              <Input
                type="date"
                value={fmtDateInput(form.dateIn)}
                onChange={(e) =>
                  setForm({ ...form, dateIn: new Date(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Date Out</Label>
              <Input
                type="date"
                value={fmtDateInput(form.dateOut ?? null)}
                onChange={(e) =>
                  setForm({ ...form, dateOut: new Date(e.target.value) })
                }
              />
            </div>
          </div>
        </div>

        {/* Payment Section */}
        <hr className="section-divider p-0 m-0" />
        <div>
          <h3 className="font-semibold">Payment</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as PaymentStatus })
                }
                disabled
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">PAID</SelectItem>
                  <SelectItem value="PARTIAL">PARTIAL</SelectItem>
                  <SelectItem value="NP">NP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Total</Label>
              <Input
                type="number"
                value={form.total}
                onChange={(e) =>
                  setForm({ ...form, total: Number(e.target.value) })
                }
                disabled
              />
            </div>
            <div>
              <Label>Amount Paid</Label>
              <Input
                type="number"
                value={form.amountPaid}
                onChange={(e) =>
                  setForm({ ...form, amountPaid: Number(e.target.value) })
                }
                disabled
              />
            </div>
            <div>
              <Label>Remaining Balance</Label>
              <Input value={remainingBalance} disabled />
            </div>
          </div>
        </div>

        {/* Transactions */}
        <hr className="section-divider p-0 m-0" />
        <div className="space-y-4">
          <h3 className="font-semibold">Transactions</h3>
          
          {/* Show loading state */}
          {isLoading && <p className="text-muted-foreground">Loading line items...</p>}
          
          {/* Show error if any */}
          {error && <p className="text-red-500">Error: {error}</p>}
          
          {!isLoading && !error && (!form.transactions || form.transactions.length === 0) && (
            <p className="text-muted-foreground">No line items found for this transaction.</p>
          )}
          
          {form.transactions?.map((t, idx) => (
            <div key={t.id} className="p-3 border rounded-md space-y-3">
              {/* Shoe model + transaction ID */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Transaction ID</Label>
                  <Input value={t.id} disabled />
                </div>
                <div>
                  <Label>Shoe Model</Label>
                  <Input
                    value={t.shoeModel}
                    onChange={(e) =>
                      setForm((prev) => {
                        const newTx = [...(prev.transactions ?? [])]
                        newTx[idx].shoeModel = e.target.value
                        return { ...prev, transactions: newTx }
                      })
                    }
                  />
                </div>
              </div>

              {/* Services / Additional / Rush / Status */}
              <div className="grid gap-4 grid-cols-3 sm:grid-cols-[1fr_1fr_0.5fr_2fr]">
                {/* Services */}
                <div>
                  <Label>Services</Label>
                  <div className="flex flex-col flex-wrap gap-1 mt-1">
                    {SERVICE_OPTIONS.map((opt) => (
                      <label key={opt} className="flex items-center space-x-2">
                        <Checkbox
                          checked={includesIgnoreCase(t.serviceNeeded, opt)}
                          onCheckedChange={(checked) =>
                            setForm((prev) => {
                              const newTx = [...(prev.transactions ?? [])]
                              const arr = newTx[idx].serviceNeeded || []
                              if (checked) {
                                if (!arr.includes(opt)) arr.push(opt)
                              } else {
                                const i = arr.findIndex(s => s.toLowerCase().trim() === opt.toLowerCase().trim())
                                if (i > -1) arr.splice(i, 1)
                              }
                              newTx[idx].serviceNeeded = arr
                              return { ...prev, transactions: newTx }
                            })
                          }
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Additional */}
                <div>
                  <Label>Additional</Label>
                  <div className="flex flex-col flex-wrap gap-1 mt-1">
                    {ADDITIONAL_OPTIONS.map((opt) => (
                      <label key={opt} className="flex items-center space-x-2">
                        <Checkbox
                          checked={includesIgnoreCase(t.additional, opt)}
                          onCheckedChange={(checked) =>
                            setForm((prev) => {
                              const newTx = [...(prev.transactions ?? [])]
                              const arr = newTx[idx].additional
                              if (checked) {
                                if (!arr.includes(opt)) arr.push(opt)
                              } else {
                                const i = arr.indexOf(opt)
                                if (i > -1) arr.splice(i, 1)
                              }
                              return { ...prev, transactions: newTx }
                            })
                          }
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rush */}
                <div>
                  <Label>Rush</Label>
                  <RadioGroup
                    value={t.rush ? "yes" : "no"}
                    className="mt-1"
                    onValueChange={(v) =>
                      setForm((prev) => {
                        const newTx = [...(prev.transactions ?? [])]
                        newTx[idx].rush = v === "yes"
                        return { ...prev, transactions: newTx }
                      })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id={`rush-yes-${idx}`} />
                      <Label htmlFor={`rush-yes-${idx}`}>Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id={`rush-no-${idx}`} />
                      <Label htmlFor={`rush-no-${idx}`}>No</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Status timeline */}
                <div>
                  <Label>Status: {t.status || "—"}</Label>
                  <div className="mt-1 space-y-1 text-sm">
                    {(() => {
                      const statusEntries = STATUS_LABELS.map(({ key, label }) => ({
                        key,
                        label,
                        value: t.statusDates?.[key],
                      }))
                      const lastFilledIndex = statusEntries
                        .map((e) => !!e.value)
                        .lastIndexOf(true)

                      return statusEntries.slice(0, lastFilledIndex + 1).map(({ key, label, value }, i) => {
                        const isCurrent = i === lastFilledIndex
                        return (
                          <div key={key} className="relative flex items-center gap-2">
                            {/* Remove last status - don't show for queued status */}
                            {isCurrent && key !== "queued" && (
                              <Button
                                type="button"
                                variant="unselected"
                                size="icon"
                                className="absolute -left-3"
                                onClick={async () => {
                                  // Get previous status key
                                  const prevKey = statusEntries[lastFilledIndex - 1]?.key || "queued"
                                  
                                  // Update local state
                                  setForm((prev) => {
                                    const newTx = [...(prev.transactions ?? [])]
                                    newTx[idx].statusDates = {
                                      ...newTx[idx].statusDates,
                                      [key]: null,
                                    }
                                    newTx[idx].status = prevKey
                                    return { ...prev, transactions: newTx }
                                  })
                                  
                                  try {
                                    // Update database - remove current date and set previous status
                                    const dbFieldName = STATUS_TO_DB_FIELD[key]
                                    if (dbFieldName) {
                                      await updateDates(t.id, {
                                        [dbFieldName]: null,
                                        current_status: STATUS_TO_NUMBER[prevKey] || 1
                                      })
                                      toast.success(`${label} date removed successfully`)
                                    }
                                  } catch (err: any) {
                                    console.error(`Failed to remove ${label} date:`, err)
                                    toast.error(`Failed to remove ${label} date: ${err.message || "Unknown error"}`)
                                  }
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}

                            <span className="ml-8 min-w-[120px]">{label}:</span>
                            <Input
                              type="date"
                              value={value ?? ""}
                              onChange={async (e) => {
                                const updatedDate = e.target.value
                                
                                // Update local state
                                setForm((prev) => {
                                  const newTx = [...(prev.transactions ?? [])]
                                  newTx[idx].statusDates = {
                                    ...newTx[idx].statusDates,
                                    [key]: updatedDate,
                                  }
                                  newTx[idx].status = key
                                  return { ...prev, transactions: newTx }
                                })
                                
                                try {
                                  // Update date in database
                                  const dbFieldName = STATUS_TO_DB_FIELD[key]
                                  if (dbFieldName) {
                                    await updateDates(t.id, {
                                      [dbFieldName]: updatedDate ? new Date(updatedDate).toISOString() : null,
                                      current_status: STATUS_TO_NUMBER[key] || 1
                                    })
                                    toast.success(`${label} date updated successfully`)
                                  }
                                } catch (err: any) {
                                  console.error(`Failed to update ${label} date:`, err)
                                  toast.error(`Failed to update ${label} date: ${err.message || "Unknown error"}`)
                                }
                              }}
                            />
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="flex items-center gap-2">
                <Label className="min-w-[120px]">Before Image</Label>
                <Input
                  value={t.beforeImage ?? ""}
                  onChange={(e) => {
                    const val = e.target.value
                    setForm((prev) => {
                      const newTx = [...(prev.transactions ?? [])]
                      newTx[idx].beforeImage = val
                      return { ...prev, transactions: newTx }
                    })
                  }}
                />
                <Button variant="outline" size="icon">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Label className="min-w-[120px]">After Image</Label>
                <Input
                  value={t.afterImage ?? ""}
                  onChange={(e) => {
                    const val = e.target.value
                    setForm((prev) => {
                      const newTx = [...(prev.transactions ?? [])]
                      newTx[idx].afterImage = val
                      return { ...prev, transactions: newTx }
                    })
                  }}
                />
                <Button variant="outline" size="icon">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Upload buttons for before and after images */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBeforeImgModal({ open: true, lineItemId: t.id })}
                >
                  Upload BFR
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAfterImgModal({ open: true, lineItemId: t.id })}
                >
                  Upload AFT
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Close
          </Button>
          <Button 
            className="bg-[#CE1616] hover:bg-[#E64040] text-white"
            onClick={handleSaveChanges}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogContent className="max-w-md mx-auto p-6">
              <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete this receipt? This action cannot be undone.
              </p>
              
              {/* Show error message if any */}
              {error && <p className="text-red-500 text-sm mb-4">Error: {error}</p>}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Receipt"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete receipt #{form.id}, all its line items,
              and all associated date records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Yes, delete everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Before Image Modal */}
      <OpBfrImg
        open={beforeImgModal.open}
        onOpenChange={(open) =>
          setBeforeImgModal((state) => (open ? state : { open: false, lineItemId: null }))
        }
        lineItemId={beforeImgModal.lineItemId}
        onImageUploaded={handleBeforeImageUploaded}
      />

      {/* After Image Modal */}
      <OpAfrImg
        open={afterImgModal.open}
        onOpenChange={(open) =>
          setAfterImgModal((state) => (open ? state : { open: false, lineItemId: null }))
        }
        lineItemId={afterImgModal.lineItemId}
        onImageUploaded={handleAfterImageUploaded}
      />
    </Dialog>
  )
}

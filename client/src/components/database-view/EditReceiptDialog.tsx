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
import { 
  Archive, 
  X, 
  RotateCcw, 
  Upload, 
  Calendar, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Home, 
  Building, 
  CreditCard, 
  Clock,
  Image,
  ImageIcon,
} from "lucide-react"
import { getLineItemsByTransact } from "@/utils/api/getLineItemsByTransact"
import { getDatesByLineItem } from "@/utils/api/getDatesByLineItem"
import { getCustomerById } from "@/utils/api/getCustomerById"
import { updateTransaction } from "@/utils/api/updateTransaction"
import { updateLineItem } from "@/utils/api/updateLineItem"
import { updateDates } from "@/utils/api/updateDates"
import { archiveTransaction } from "@/utils/api/archiveTransaction"
import { restoreTransaction } from "@/utils/api/restoreTransaction"
import { getTransactionById } from "@/utils/api/getTransactionById"
import { toast } from "sonner"
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

import { ReceiptRow, TxStatusDates, PaymentStatus, Transaction} from "./central-view.types"

const BRANCH_LEGEND: Record<
  string,
  { branch: string; location: string }
> = {
  "SMBAL-B-NCR": { branch: "SM Baliwag Branch", location: "Baliwag" },
  "SMVAL-B-NCR": { branch: "SM Valenzuela Branch", location: "Valenzuela" },
  "SMGRA-B-NCR": { branch: "SM Grand Branch", location: "Caloocan" },
  "SWAS-SUPERADMIN": { branch: "Super Admin", location: "N/A" },
  "HUBV-W-NCR": { branch: "Valenzuela Hub", location: "Valenzuela City" },
}

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-yellow-100 text-yellow-800",
  readyForDelivery: "bg-blue-100 text-blue-800",
  toWarehouse: "bg-indigo-100 text-indigo-800",
  inProcess: "bg-purple-100 text-purple-800",
  returnToBranch: "bg-orange-100 text-orange-800",
  received: "bg-teal-100 text-teal-800",
  readyForPickup: "bg-green-100 text-green-800",
  pickedUp: "bg-gray-100 text-gray-800",
}

// Payment status badge styles
const PAYMENT_STATUS_STYLES = {
  PAID: {
    background: "#d1fae5",
    color: "#15803d",
    borderColor: "#a7f3d0",
    label: "PAID"
  },
  PARTIAL: {
    background: "#ffedd5",
    color: "#ea580c",
    borderColor: "#fdba74",
    label: "PARTIAL"
  },
  NP: {
    background: "#fee2e2",
    color: "#dc2626",
    borderColor: "#fecaca",
    label: "NP"
  }
}

// Custom Sneaker Icon - using the SVG from the top of your request
const SneakerIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14.1 7.9 12.5 10"/>
    <path d="M17.4 10.1 16 12"/>
    <path d="M2 16a2 2 0 0 0 2 2h13c2.8 0 5-2.2 5-5a2 2 0 0 0-2-2c-.8 0-1.6-.2-2.2-.7l-6.2-4.2c-.4-.3-.9-.2-1.3.1 0 0-.6.8-1.2 1.1a3.5 3.5 0 0 1-4.2.1C4.4 7 3.7 6.3 3.7 6.3A.92.92 0 0 0 2 7Z"/>
    <path d="M2 11c0 1.7 1.3 3 3 3h7"/>
  </svg>
);

export function EditReceiptDialog({
  open,
  onOpenChange,
  receipt,
  onReceiptUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptRow;
  onReceiptUpdate?: (updatedReceipt: ReceiptRow) => void;
}) {
  const [form, setForm] = React.useState<ReceiptRow>(receipt)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [customerLoading, setCustomerLoading] = React.useState(false)
  const [customerError, setCustomerError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [showArchiveRestoreConfirm, setShowArchiveRestoreConfirm] = React.useState(false)
  const [isArchivingRestoring, setIsArchivingRestoring] = React.useState(false)
  const [beforeImgModal, setBeforeImgModal] = React.useState<{ open: boolean; lineItemId: string | null }>({ open: false, lineItemId: null });
  const [afterImgModal, setAfterImgModal] = React.useState<{ open: boolean; lineItemId: string | null }>({ open: false, lineItemId: null });

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
    { key: "queued", label: "QUEUED" },
    { key: "readyForDelivery", label: "READY FOR DELIVERY" },
    { key: "toWarehouse", label: "TO WAREHOUSE" },
    { key: "inProcess", label: "IN PROCESS" },
    { key: "returnToBranch", label: "RETURN TO BRANCH" },
    { key: "received", label: "RECEIVED" },
    { key: "readyForPickup", label: "READY FOR PICKUP" },
    { key: "pickedUp", label: "PICKED UP" },
  ]

  const STATUS_TO_DB_FIELD: Record<string, string> = {
    "queued": "srm_date",
    "readyForDelivery": "rd_date",
    "toWarehouse": "ibd_date",
    "inProcess": "wh_date",
    "returnToBranch": "rb_date",
    "received": "is_date",
    "readyForPickup": "rpu_date",
  }

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

  React.useEffect(() => {
    async function fetchLineItems() {
      if (!open || !receipt.id) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        const lineItems = await getLineItemsByTransact(receipt.id)
        
        const transactions: Transaction[] = await Promise.all(
          lineItems.map(async (item: any) => {
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
              const dates = await getDatesByLineItem(item.line_item_id)
              
              if (dates) {
                statusDates = {
                  queued: dates.srm_date ? new Date(dates.srm_date).toISOString().slice(0, 10) : null,
                  readyForDelivery: dates.rd_date ? new Date(dates.rd_date).toISOString().slice(0, 10) : null,
                  toWarehouse: dates.ibd_date ? new Date(dates.ibd_date).toISOString().slice(0, 10) : null,
                  inProcess: dates.wh_date ? new Date(dates.wh_date).toISOString().slice(0, 10) : null,
                  returnToBranch: dates.rb_date ? new Date(dates.rb_date).toISOString().slice(0, 10) : null,
                  received: dates.is_date ? new Date(dates.is_date).toISOString().slice(0, 10) : null,
                  readyForPickup: dates.rpu_date ? new Date(dates.rpu_date).toISOString().slice(0, 10) : null,
                  pickedUp: null,
                }
                
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
            }
            
            return {
              id: item.line_item_id,
              shoeModel: item.shoes || "Unknown model",
              serviceNeeded,
              additional,
              rush: item.priority === "Rush",
              status: currentStatus || "queued",
              statusDates,
              beforeImage: item.before_img || null,
              afterImage: item.after_img || null
            }
          })
        )
        
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

  React.useEffect(() => {
    async function fetchCustomerDetails() {
      if (!open || !receipt.customerId) return
      
      setCustomerLoading(true)
      setCustomerError(null)
      
      try {
        const customerData = await getCustomerById(receipt.customerId)
        
        setForm(prev => ({
          ...prev,
          customer: customerData.cust_name,
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

  React.useEffect(() => {
    async function fetchCompleteTransactionData() {
      if (!open || !receipt.id) return
      
      try {
        const completeTransactionData = await getTransactionById(receipt.id)
        
        if (completeTransactionData.transaction) {
          setForm(prev => ({
            ...prev,
            is_archive: completeTransactionData.transaction.is_archive || false
          }))
        }
      } catch (error) {
        console.error("Failed to fetch complete transaction data:", error)
        setForm(prev => ({
          ...prev,
          is_archive: false
        }))
      }
    }
    
    fetchCompleteTransactionData()
  }, [open, receipt.id])

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

  const includesIgnoreCase = (arr: string[] | undefined, value: string) =>
    !!arr?.some((s) => s.toLowerCase().trim() === value.toLowerCase().trim())

  const branchInfo = BRANCH_LEGEND[form.branch as string] || { branch: form.branch, location: form.branchLocation }

  const handleSaveChanges = async () => {
    if (!form.id) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const transactionUpdates = {
        received_by: form.receivedBy,
        date_in: form.dateIn?.toISOString(),
        date_out: form.dateOut?.toISOString() || null,
        total_amount: form.total,
        amount_paid: form.amountPaid,
        payment_status: form.status,
      };
      
      await updateTransaction(form.id, transactionUpdates);
      
      if (form.transactions && form.transactions.length > 0) {
        await Promise.all(
          form.transactions.map(async (tx) => {
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
            
            const lineItemUpdates = {
              shoes: tx.shoeModel,
              priority: tx.rush ? "Rush" : "Normal",
              services: services.filter(s => s.service_id),
              before_img: tx.beforeImage || null,
              after_img: tx.afterImage || null,
              current_status: STATUS_TO_STRING[tx.status],
            }
            
            await updateLineItem(tx.id, lineItemUpdates)
            
            if (tx.statusDates) {
              const dateUpdates: Record<string, string | null> = {}
              
              Object.entries(tx.statusDates).forEach(([statusKey, dateValue]) => {
                const dbFieldName = STATUS_TO_DB_FIELD[statusKey]
                if (dbFieldName) {
                  dateUpdates[dbFieldName] = dateValue ? new Date(dateValue).toISOString() : null
                }
              })
              
              await updateDates(tx.id, {
                ...dateUpdates,
                current_status: STATUS_TO_NUMBER[tx.status] || 1
              })
            }
          })
        )
      }
      
      toast.success("Transaction updated successfully")
      
      if (onReceiptUpdate) {
        onReceiptUpdate(form);
      }
      
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to save changes:", err)
      setError(err.message || "Failed to save changes")
      toast.error(err.message || "An error occurred while saving changes")
    } finally {
      setIsSaving(false);
    }
  }

  const handleArchiveRestore = async () => {
    if (!form.id) return
    
    const isArchived = form.is_archive === true
    const action = isArchived ? "restore" : "archive"
    
    setIsArchivingRestoring(true)
    setError(null)
    
    try {
      if (isArchived) {
        await restoreTransaction(form.id);
        toast.success("Receipt restored successfully")
      } else {
        await archiveTransaction(form.id);
        toast.success("Receipt archived successfully")
      }
      
      if (onReceiptUpdate) {
        onReceiptUpdate({...receipt, deleted: true});
      }
      
      onOpenChange(false)
    } catch (err: any) {
      console.error(`Failed to ${action} receipt:`, err)
      setError(err.message || `Failed to ${action} receipt`)
      toast.error(err.message || `An error occurred while ${action.slice(0, -1)}ing`)
    } finally {
      setIsArchivingRestoring(false)
      setShowArchiveRestoreConfirm(false)
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

  const formatDisplayDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "mm/dd/yyyy";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "mm/dd/yyyy";
      return date.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
      });
    } catch {
      return "mm/dd/yyyy";
    }
  };

  // Get payment status style
  const getPaymentStatusStyle = (status: string) => {
    const style = PAYMENT_STATUS_STYLES[status as keyof typeof PAYMENT_STATUS_STYLES];
    if (!style) return null;
    return {
      style: {
        borderRadius: "999px",
        padding: "6px 10px",
        fontSize: "0.82rem",
        fontWeight: "800",
        border: "1px solid transparent",
        whiteSpace: "nowrap" as const,
        display: "inline-block",
        minWidth: "50px",
        textAlign: "center" as const,
        background: style.background,
        color: style.color,
        borderColor: style.borderColor
      }
    };
  };

  // Get color for amount paid based on status
  const getAmountPaidColor = (status: string) => {
    const style = PAYMENT_STATUS_STYLES[status as keyof typeof PAYMENT_STATUS_STYLES];
    return style ? style.color : "#000000";
  };

  // Bootstrap check circle with white check inside red circle
  const BootstrapCheckCircle = () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="18" 
      height="18" 
      viewBox="0 0 16 16"
      style={{ flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="7" fill="#CE1616" />
      <path 
        d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z" 
        fill="white"
      />
    </svg>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto [&>button]:hidden p-0">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Edit Receipt {form.id}</h2>
            <p className="text-sm text-muted-foreground">Manage transaction details and service status</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchiveRestoreConfirm(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 extra-bold"
            >
              {form.is_archive ? <RotateCcw className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
              {form.is_archive ? "Restore" : "Archive"}
            </Button>
          </div>
        </div>

        <div className="px-6 pt-4 space-y-8">
          {/* Customer Details & Branch Information - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Details */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Details
              </h3>
              {customerLoading && <p className="text-muted-foreground text-sm">Loading customer details...</p>}
              {customerError && <p className="text-red-500 text-sm">Error: {customerError}</p>}
              
              <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                {/* Customer Name and Birthday in flex row */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground font-medium">Customer Name</Label>
                    <p className="font-medium text-base">{form.customer || "—"}</p>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground font-medium">Birthday</Label>
                    <p className="font-medium text-base">{form.customerBirthday ? formatDisplayDate(form.customerBirthday) : "—"}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">Email</Label>
                  <p className="font-medium text-base">{form.email || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">Contact</Label>
                  <p className="font-medium text-base">{form.contact || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">Address</Label>
                  <p className="font-medium text-base">{form.address || "—"}</p>
                </div>
              </div>
            </div>

            {/* Branch Information */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Building className="w-5 h-5" />
                Branch Information
              </h3>
              
              <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                {/* Branch and Location in flex row */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground font-medium">Branch</Label>
                    <p className="font-medium text-base">{branchInfo.branch}</p>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground font-medium">Location</Label>
                    <p className="font-medium text-base">{branchInfo.location}</p>
                  </div>
                </div>
                {/* Received by with Date In and Date Out group */}
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground font-medium">Received by</Label>
                    <p className="font-medium text-base">{form.receivedBy || "—"}</p>
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row gap-4 sm:gap-4">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground font-medium">Date In</Label>
                      <p className="font-medium text-base">{fmtDateInput(form.dateIn) ? formatDisplayDate(fmtDateInput(form.dateIn)) : "—"}</p>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground font-medium">Date Out</Label>
                      <p className="font-medium text-base">{form.dateOut ? formatDisplayDate(form.dateOut.toISOString()) : "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary with status badge inside the div */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Summary
              </h3>
              {form.status && (
                <span className="extra-bold" {...getPaymentStatusStyle(form.status)}>
                  {PAYMENT_STATUS_STYLES[form.status as keyof typeof PAYMENT_STATUS_STYLES]?.label || form.status}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground font-medium">Total Amount</Label>
                <p className="text-2xl font-bold text-black">₱ {form.total?.toFixed(2) || "0.00"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-medium">Amount Paid</Label>
                <p 
                  className="text-2xl font-bold"
                  style={{ color: form.status ? getAmountPaidColor(form.status) : "#000000" }}
                >
                  ₱ {form.amountPaid?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-medium">Remaining Balance</Label>
                <p className="text-2xl font-bold text-black">
                  ₱ {remainingBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Transactions - Shoes */}
          <div className="space-y-6">
            {isLoading && <p className="text-muted-foreground">Loading line items...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}
            
            {!isLoading && !error && (!form.transactions || form.transactions.length === 0) && (
              <p className="text-muted-foreground">No line items found.</p>
            )}
            
            {form.transactions?.map((t, idx) => (
              <div key={t.id}>
                {/* Shoes # with custom sneaker icon */}
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <SneakerIcon className="w-5 h-5" />
                  Shoes #{idx + 1}
                </h3>
                
                {/* Transaction container with border only, no bg */}
                <div className="border rounded-lg p-4 space-y-4">
                  {/* Transaction ID, Shoe Model, and Services - Now flex to column on smaller screens */}
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs text-muted-foreground">ID</Label>
                      <p className="font-medium text-sm break-all">{t.id}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="text-xs text-muted-foreground">Shoe Model</Label>
                      <p className="font-medium text-sm break-all">{t.shoeModel}</p>
                    </div>
                    <div className="flex-[2] min-w-0">
                      <Label className="text-xs text-muted-foreground">Selected Services</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.serviceNeeded?.map(service => (
                          <span key={service} className="text-xs bg-gray-100 text-gray-800 px-3 py-1 rounded-full">
                            {service}
                          </span>
                        ))}
                        {t.additional?.map(service => (
                          <span key={service} className="text-xs bg-gray-100 text-gray-800 px-3 py-1 rounded-full">
                            {service}
                          </span>
                        ))}
                        {(!t.serviceNeeded?.length && !t.additional?.length) && (
                          <span className="text-xs text-muted-foreground">No services selected</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Timeline - flex column with title above date input, 4 grid */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Status Timeline</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-1">
                      {STATUS_LABELS.map(({ key, label }) => {
                        const value = t.statusDates?.[key];
                        const hasData = !!value;
                        const isEditable = key === "queued" || 
                          (key === "readyForDelivery" && t.statusDates?.queued) ||
                          (key === "toWarehouse" && t.statusDates?.readyForDelivery) ||
                          (key === "inProcess" && t.statusDates?.toWarehouse) ||
                          (key === "returnToBranch" && t.statusDates?.inProcess) ||
                          (key === "received" && t.statusDates?.returnToBranch) ||
                          (key === "readyForPickup" && t.statusDates?.received);
                        
                        return (
                          <div 
                            key={key} 
                            className="flex flex-col p-2 rounded-md transition-colors duration-200"
                            style={{
                              backgroundColor: hasData ? "#FEF2F2" : "transparent",
                              border: hasData ? "1px solid #FECACA" : "1px solid #E5E7EB",
                            }}
                            onMouseEnter={(e) => {
                              if (hasData) {
                                e.currentTarget.style.backgroundColor = "#FECACA";
                                e.currentTarget.style.borderColor = "#CE1616";
                              } else if (isEditable) {
                                e.currentTarget.style.backgroundColor = "#F3F4F6";
                                e.currentTarget.style.borderColor = "#9CA3AF";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (hasData) {
                                e.currentTarget.style.backgroundColor = "#FEF2F2";
                                e.currentTarget.style.borderColor = "#FECACA";
                              } else {
                                e.currentTarget.style.backgroundColor = "transparent";
                                e.currentTarget.style.borderColor = "#E5E7EB";
                              }
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span 
                                className="text-xs extra-bold uppercase"
                                style={{ color: hasData ? "#CE1616" : "#9CA3AF" }}
                              >
                                {label}
                              </span>
                              {hasData && <BootstrapCheckCircle />}
                            </div>
                            <Input
                              type="date"
                              value={value ?? ""}
                              onChange={async (e) => {
                                const updatedDate = e.target.value
                                
                                setForm((prev) => {
                                  const newTx = [...(prev.transactions ?? [])]
                                  newTx[idx].statusDates = {
                                    ...newTx[idx].statusDates,
                                    [key]: updatedDate,
                                  }
                                  if (updatedDate) {
                                    newTx[idx].status = key
                                  }
                                  return { ...prev, transactions: newTx }
                                })
                                
                                try {
                                  const dbFieldName = STATUS_TO_DB_FIELD[key]
                                  if (dbFieldName) {
                                    await updateDates(t.id, {
                                      [dbFieldName]: updatedDate ? new Date(updatedDate).toISOString() : null,
                                      current_status: updatedDate ? (STATUS_TO_NUMBER[key] || 1) : (STATUS_TO_NUMBER[Object.keys(t.statusDates || {}).filter(k => t.statusDates?.[k as keyof TxStatusDates]).pop() || "queued"] || 1)
                                    })
                                    toast.success(`${label} date updated`)
                                  }
                                } catch (err: any) {
                                  console.error(`Failed to update ${label} date:`, err)
                                  toast.error(`Failed to update ${label} date`)
                                }
                              }}
                              className="w-full"
                              disabled={!isEditable}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Images */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Image className="w-3.5 h-3.5" />
                          Before Service
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBeforeImgModal({ open: true, lineItemId: t.id })}
                          className="bg-[#FEF2F2] border-[#FECACA] text-[#CE1616] hover:bg-[#CE1616] hover:border-[#CE1616] hover:text-white extra-bold w-full sm:w-auto transition-colors duration-200"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1" />
                          Upload
                        </Button>
                      </div>
                      <Input
                        value={t.beforeImage || "Link will appear after upload..."}
                        disabled
                        className="text-sm mt-1"
                      />
                    </div>
                    <div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Image className="w-3.5 h-3.5" />
                          After Service
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAfterImgModal({ open: true, lineItemId: t.id })}
                          className="bg-[#FEF2F2] border-[#FECACA] text-[#CE1616] hover:bg-[#CE1616] hover:border-[#CE1616] hover:text-white extra-bold w-full sm:w-auto transition-colors duration-200"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1" />
                          Upload
                        </Button>
                      </div>
                      <Input
                        value={t.afterImage || "Link will appear after upload..."}
                        disabled
                        className="text-sm mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white pt-4 border-t flex flex-col sm:flex-row justify-end gap-2 pb-4">
            <Button variant="outline" className="extra-bold w-full sm:w-auto" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Close
            </Button>
            <Button 
              className="bg-[#CE1616] hover:bg-[#A00000] text-white extra-bold w-full sm:w-auto transition-colors duration-200"
              onClick={handleSaveChanges}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
      
      {/* Archive/Restore confirmation dialog */}
      <AlertDialog open={showArchiveRestoreConfirm} onOpenChange={setShowArchiveRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {form.is_archive 
                ? `This will restore receipt #${form.id} and move it back to active records.`
                : `This will archive receipt #${form.id} and move it to the archived records. You can restore it later if needed.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchivingRestoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveRestore}
              disabled={isArchivingRestoring}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isArchivingRestoring 
                ? (form.is_archive ? "Restoring..." : "Archiving...") 
                : (form.is_archive ? "Yes, restore receipt" : "Yes, archive receipt")
              }
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
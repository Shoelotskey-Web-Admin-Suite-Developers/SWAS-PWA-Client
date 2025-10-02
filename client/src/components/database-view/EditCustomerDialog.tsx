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
import { Button } from "@/components/ui/button"
import { Trash2, Save } from "lucide-react"
import { deleteCustomer } from "@/utils/api/deleteCustomer"
import { editCustomer } from "@/utils/api/editCustomer"
import type { CustomerRow } from "@/components/database-view/central-view.types"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: CustomerRow
  onCustomerDeleted?: (id: string) => void
  onCustomerEdited?: (updated: CustomerRow) => void
  onSave?: (updated: CustomerRow) => Promise<void>
}

export function EditCustomerDialog({
  open,
  onOpenChange,
  customer,
  onCustomerDeleted,
  onCustomerEdited,
  onSave,
}: Props) {
  const [form, setForm] = React.useState<CustomerRow>(customer)
  const [loadingDelete, setLoadingDelete] = React.useState(false)
  const [loadingSave, setLoadingSave] = React.useState(false)

  React.useEffect(() => {
    if (open) setForm(customer)
  }, [customer, open])

  const handleField =
    <K extends keyof CustomerRow>(key: K) =>
    (value: CustomerRow[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    }

  const handleSave = async () => {
    setLoadingSave(true)
    try {
      if (onSave) {
        // If parent passed a custom onSave, use it
        await onSave(form)
      } else {
        // Call API directly
        await editCustomer(form.id, {
          cust_name: form.name,
          cust_bdate: form.birthday ?? null,
          cust_address: form.address,
          cust_contact: form.contact,
          cust_email: form.email,
        })

        // Notify parent to update local state
        onCustomerEdited && onCustomerEdited(form)
      }

      onOpenChange(false)
    } catch (err) {
      console.error("Failed to save customer:", err)
      alert("Failed to save customer. Check console for details.")
    } finally {
      setLoadingSave(false)
    }
  }

  const handleDelete = async () => {
    const displayName = form.name || form.id
    const confirmed = window.confirm(
      `Are you sure you want to delete ${displayName}? This action cannot be undone.`
    )
    if (!confirmed) return

    setLoadingDelete(true)
    try {
      await deleteCustomer(form.id)
      onCustomerDeleted && onCustomerDeleted(form.id)
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to delete customer:", err)
      alert("Failed to delete customer. Check console for details.")
    } finally {
      setLoadingDelete(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl mt-[50px] overflow-y-auto [&>button]:hidden">
        <div className="absolute right-5 top-3 flex gap-2">
          <Button
            className="bg-transparent hover:bg-[#CE1616] active:bg-[#E64040] text-black hover:text-white extra-bold"
            size="icon"
            onClick={handleDelete}
            disabled={loadingDelete || loadingSave}
            title="Delete customer"
          >
            <Trash2 className="w-6 h-6" />
          </Button>
        </div>

        <DialogHeader className="items-start text-left">
          <DialogTitle asChild>
            <h1 className="text-lg font-semibold">Edit Customer {form.id}</h1>
          </DialogTitle>
        </DialogHeader>

        <hr className="section-divider p-0 m-0" />

        <div className="pt-4 grid gap-4 grid-cols-1 sm:grid-cols-[25%_25%_1fr]">
          <div>
            <Label>Customer Name</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => handleField("name")(e.target.value)}
            />
          </div>

          <div>
            <Label>Birthday</Label>
            <Input
              type="date"
              value={form.birthday ?? ""}
              onChange={(e) => handleField("birthday")(e.target.value)}
            />
          </div>

          <div>
            <Label>Address</Label>
            <Input
              value={form.address ?? ""}
              onChange={(e) => handleField("address")(e.target.value)}
            />
          </div>

          <div>
            <Label>Contact</Label>
            <Input
              type="tel"
              value={form.contact ?? ""}
              onChange={(e) => handleField("contact")(e.target.value)}
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => handleField("email")(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            className="extra-bold"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loadingDelete || loadingSave}
          >
            Cancel
          </Button>

          <Button
            className="bg-[#CE1616] hover:bg-[#E64040] text-white extra-bold"
            onClick={handleSave}
            disabled={loadingSave || loadingDelete}
          >
            <Save className="w-4 h-4 mr-2" />
            {loadingSave ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

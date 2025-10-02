// src/components/database-view/EditBranchDialog.tsx
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
import { Trash2 } from "lucide-react"

// ✅ Define BranchRow type (or import if you already have one)
export type BranchRow = {
  branchId: string
  branchName: string
  location: string
}

export function EditBranchDialog({
  open,
  onOpenChange,
  branch,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  branch: BranchRow
}) {
  const [form, setForm] = React.useState<BranchRow>(branch)

  React.useEffect(() => {
    setForm(branch)
  }, [branch])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl mt-[50px] overflow-y-auto [&>button]:hidden">
        {/* Delete button */}
        <div className="absolute right-5 top-3 flex gap-2">
          <Button
            className="bg-transparent hover:bg-[#CE1616] active:bg-[#E64040] text-black hover:text-white extra-bold"
            size="icon"
            onClick={() => {
              console.log("Delete branch", form.branchId)
            }}
          >
            <Trash2 className="w-10 h-10" />
          </Button>
        </div>

        <DialogHeader className="items-start text-left">
          <DialogTitle asChild>
            <h1>Edit Branch {form.branchId}</h1>
          </DialogTitle>
        </DialogHeader>

        {/* Branch Fields */}
        <hr className="section-divider p-0 m-0" />
        <div>
          <h3 className="font-semibold">Branch Information</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <Label>Branch Name</Label>
              <Input
                value={form.branchName}
                onChange={(e) =>
                  setForm({ ...form, branchName: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            className="extra-bold"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#CE1616] hover:bg-[#E64040] text-white extra-bold"
            onClick={() => {
              console.log("Save branch", form)
              onOpenChange(false)
            }}
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

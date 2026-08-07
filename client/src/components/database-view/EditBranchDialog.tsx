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
import { editBranch } from "@/utils/api/editBranch"
import { deleteBranch } from "@/utils/api/deleteBranch"
import { toast } from "sonner"

export type BranchRow = {
  branchId: string
  branchName: string
  location: string
  branchCode?: string
  type?: string
  fbLink?: string | null
}

interface EditBranchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branch: BranchRow
  onBranchDeleted: (branchId: string) => void
  onBranchEdited: (branch: BranchRow) => void
}

export function EditBranchDialog({
  open,
  onOpenChange,
  branch,
  onBranchDeleted,
  onBranchEdited,
}: EditBranchDialogProps) {
  const [form, setForm] = React.useState<BranchRow>(branch)
  const [error, setError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    setForm(branch)
  }, [branch])

  const isSuperAdmin = branch.branchId === "SWAS-SUPERADMIN"

  const validateBranchId = (id: string) => {
    const pattern = /^[A-Za-z0-9]{5}-[BW]-[A-Za-z0-9]{3}$/
    return pattern.test(id)
  }

  const handleDelete = async () => {
    if (isSuperAdmin) {
      setError("SWAS-SUPERADMIN branch cannot be deleted")
      return
    }
    
    if (confirm(`Are you sure you want to delete branch ${form.branchId}?`)) {
      setIsLoading(true)
      try {
        await deleteBranch(form.branchId)
        onBranchDeleted(form.branchId)
        toast.success("Branch deleted successfully")
        onOpenChange(false)
      } catch (err) {
        console.error("Failed to delete branch:", err)
        if (err instanceof Error) {
          setError(err.message)
          toast.error(`Failed to delete branch: ${err.message}`)
        } else {
          setError("Failed to delete branch")
          toast.error("Failed to delete branch")
        }
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleSave = async () => {
    if (!form.branchName || !form.location) {
      setError("Branch Name and Location are required")
      return
    }

    if (!validateBranchId(form.branchId)) {
      setError("Branch ID format is invalid")
      return
    }

    // Validate Facebook link if provided
    if (form.fbLink && !form.fbLink.startsWith('https://') && !form.fbLink.startsWith('http://')) {
      setError("Facebook link must start with http:// or https://")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Prepare data for API
      const updateData: any = {
        branch_name: form.branchName,
        location: form.location,
      }

      // Add optional fields if they exist
      if (form.branchCode) {
        updateData.branch_code = form.branchCode
      }
      if (form.type) {
        updateData.type = form.type
      }
      if (form.fbLink !== undefined) {
        updateData.fb_link = form.fbLink
      }

      await editBranch(form.branchId, updateData)
      
      onBranchEdited(form)
      toast.success("Branch updated successfully")
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to update branch:", err)
      if (err instanceof Error) {
        setError(err.message)
        toast.error(`Failed to update branch: ${err.message}`)
      } else {
        setError("Failed to update branch")
        toast.error("Failed to update branch")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl mt-[50px] overflow-y-auto [&>button]:hidden">
        {/* Delete button - hidden for SWAS-SUPERADMIN */}
        {!isSuperAdmin && (
          <div className="absolute right-5 top-3 flex gap-2">
            <Button
              className="bg-transparent hover:bg-[#CE1616] active:bg-[#E64040] text-black hover:text-white extra-bold"
              size="icon"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 className="w-10 h-10" />
            </Button>
          </div>
        )}

        <DialogHeader className="items-start text-left">
          <DialogTitle asChild>
            <h1>{isSuperAdmin ? "Super Admin Branch" : "Edit Branch"}</h1>
          </DialogTitle>
        </DialogHeader>

        {/* Branch Fields */}
        <hr className="section-divider p-0 m-0" />
        <div>
          <h3 className="font-semibold">Branch Information</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <Label>Branch ID</Label>
              <Input
                value={form.branchId}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <small className="text-gray-400 text-xs">
                Branch ID cannot be changed
              </small>
            </div>
            <div>
              <Label>Branch Name</Label>
              <Input
                value={form.branchName}
                onChange={(e) =>
                  setForm({ ...form, branchName: e.target.value })
                }
                placeholder="Enter branch name"
                disabled={isSuperAdmin || isLoading}
                className={isSuperAdmin ? "bg-gray-100 cursor-not-allowed" : ""}
              />
            </div>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 mt-4">
            <div>
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
                placeholder="Enter location"
                disabled={isSuperAdmin || isLoading}
                className={isSuperAdmin ? "bg-gray-100 cursor-not-allowed" : ""}
              />
            </div>
            <div>
              <Label>Facebook Link <span className="text-gray-400 text-sm">(optional)</span></Label>
              <Input
                value={form.fbLink || ""}
                onChange={(e) =>
                  setForm({ ...form, fbLink: e.target.value || null })
                }
                placeholder="https://www.facebook.com/your-page"
                disabled={isSuperAdmin || isLoading}
                className={isSuperAdmin ? "bg-gray-100 cursor-not-allowed" : ""}
              />
            </div>
          </div>
          {isSuperAdmin && (
            <div className="mt-2 text-gray-400 text-sm">
              Super admin branch cannot be modified
            </div>
          )}
        </div>

        {error && (
          <div className="text-[#CE1616] text-sm mt-2">{error}</div>
        )}

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            className="extra-bold"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          {!isSuperAdmin && (
            <Button
              className="bg-[#CE1616] hover:bg-[#E64040] text-white extra-bold"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          )}
          {isSuperAdmin && (
            <Button
              className="bg-gray-500 cursor-not-allowed text-white extra-bold"
              disabled
            >
              Cannot Edit Super Admin
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
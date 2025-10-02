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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Eye, EyeOff } from "lucide-react"
import { deleteUser } from "@/utils/api/deleteUser"
import { editUser } from "@/utils/api/editUser"

export type UserRow = {
  userId: string
  branchId: string
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  branchIds,
  onUserDeleted,
  onUserEdited,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserRow
  branchIds: string[]
  onUserDeleted: (userId: string) => void
  onUserEdited: (updatedUser: UserRow) => void
}) {
  const [form, setForm] = React.useState<UserRow>(user)
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  React.useEffect(() => {
    setForm(user)
    setNewPassword("")
    setConfirmPassword("")
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }, [user])

  const handleSave = async () => {
    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        alert("Passwords do not match!")
        return
      }
    }

    try {
      const updatedData: { branch_id?: string; password?: string } = {
        branch_id: form.branchId,
      }

      if (newPassword) updatedData.password = newPassword

      const updatedUser = await editUser(form.userId, updatedData)

      alert("User updated successfully")

      // Update parent state
      onUserEdited({
        userId: updatedUser.user.user_id,
        branchId: updatedUser.user.branch_id,
      })

      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert("Failed to update user")
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${form.userId}?`)) return

    try {
      await deleteUser(form.userId)
      alert("User deleted successfully")
      onUserDeleted(form.userId)
      onOpenChange(false)
    } catch (err) {
      alert("Failed to delete user")
      console.error(err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl mt-[50px] overflow-y-auto [&>button]:hidden">
        {/* Delete button */}
        <div className="absolute right-5 top-3 flex gap-2">
          <Button
            className="bg-transparent hover:bg-[#CE1616] active:bg-[#E64040] text-black hover:text-white extra-bold"
            size="icon"
            onClick={handleDelete}
          >
            <Trash2 className="w-10 h-10" />
          </Button>
        </div>

        <DialogHeader className="items-start text-left">
          <DialogTitle asChild>
            <h1>Edit User {form.userId}</h1>
          </DialogTitle>
        </DialogHeader>

        {/* User Fields */}
        <hr className="section-divider p-0 m-0" />
        <div>
          <h3 className="font-semibold">User Information</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <Label>User ID</Label>
              <Input
                value={form.userId}
                disabled
              />
            </div>
            <div>
              <Label>Branch ID</Label>
              <Select
                value={form.branchId.toString()}
                disabled
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branchIds.map((id) => (
                    <SelectItem key={id} value={id.toString()}>
                      {id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Password Reset Section */}
        <div className="mt-6">
          <h3 className="font-semibold">Password</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="relative">
              <Label>New Password</Label>
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute top-[20px] right-0 text-gray-500 bg-transparent"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="relative">
              <Label>Confirm Password</Label>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute top-[20px] right-0 text-gray-500 bg-transparent"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Leave blank if you don’t want to change the password.
          </p>
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
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

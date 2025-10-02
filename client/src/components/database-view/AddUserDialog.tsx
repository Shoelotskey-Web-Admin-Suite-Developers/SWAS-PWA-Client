"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "../ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select"
import { Eye, EyeOff } from "lucide-react"

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchIds: string[]
  defaultBranchId?: string | null
  onAddUser: (
    userId: string,
    branchId: string,
    password: string
  ) => void
}

export const AddUserDialog: React.FC<AddUserDialogProps> = ({
  open,
  onOpenChange,
  branchIds,
  onAddUser,
  defaultBranchId,
}) => {
  const [userId, setUserId] = React.useState("")
  const [branchId, setBranchId] = React.useState<string>(defaultBranchId || branchIds[0] || "")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)

  // Reset values when dialog opens
  React.useEffect(() => {
    if (open) {
      setUserId("")
      setBranchId(defaultBranchId || branchIds[0] || "")
      setPassword("")
      setShowPassword(false)
    }
  }, [open, defaultBranchId, branchIds])

  const handleSubmit = () => {
    if (!userId || !branchId || !password) return
    onAddUser(userId, branchId, password)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl mt-[50px] bg-black border-b border-black text-white [&>button]:hidden">
        <DialogHeader className="border-b border-white items-start text-left mb-[1rem]">
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {/* User ID */}
          <div>
            <Label>User ID</Label>
            <Input
              placeholder="Branch@Pos-Name/Identifier"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="bg-white text-black placeholder-gray-400"
            />
          </div>

          {/* Branch ID */}
          <div>
            <Label>Branch ID</Label>
            <Select value={branchId} onValueChange={(val) => setBranchId(val)}>
              <SelectTrigger className="bg-white text-black">
                <SelectValue placeholder="Select Branch" />
              </SelectTrigger>
              <SelectContent>
                {branchIds.map((id) => (
                  <SelectItem key={id} value={id}>
                    {id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Password (spans full width now) */}
          <div className="relative sm:col-span-2">
            <Label>Password</Label>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white text-black placeholder-gray-400 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-[20px] right-0 text-gray-500 bg-transparent"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            className="border-white bg-black text-white hover:bg-white hover:text-black"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#CE1616] hover:bg-[#E64040] text-white"
            onClick={handleSubmit}
          >
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

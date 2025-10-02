// src/components/database-view/AddBranchDialog.tsx
"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "../ui/label"

interface AddBranchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddBranch: (name: string, location: string) => void
}

export const AddBranchDialog: React.FC<AddBranchDialogProps> = ({
  open,
  onOpenChange,
  onAddBranch,
}) => {
  const [name, setName] = React.useState("")
  const [location, setLocation] = React.useState("")

  const handleSubmit = () => {
    if (!name || !location) return
    onAddBranch(name, location)
    setName("")
    setLocation("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl mt-[50px] bg-black border-b border-black text-white [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="border-b border-white items-start text-left mb-[1rem]">
          <DialogTitle className="mb-[1rem]">Add Branch</DialogTitle>
        </DialogHeader>

        {/* Inputs */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <Label>Branch Name</Label>
            <Input
              placeholder="Branch Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white text-black placeholder-gray-400"
            />
          </div>
          <div>
            <Label>Branch Location</Label>
            <Input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-white text-black placeholder-gray-400"
            />
          </div>
        </div>

        {/* Footer */}
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

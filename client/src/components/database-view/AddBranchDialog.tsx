// src/components/database-view/AddBranchDialog.tsx
"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "../ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addBranch } from "@/utils/api/addBranch"
import { toast } from "sonner"

interface AddBranchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBranchAdded: (branch: {
    branch_id: string
    branch_name: string
    location: string
  }) => void
}

export const AddBranchDialog: React.FC<AddBranchDialogProps> = ({
  open,
  onOpenChange,
  onBranchAdded,
}) => {
  const [identifier, setIdentifier] = React.useState("")
  const [branchType, setBranchType] = React.useState("B")
  const [region, setRegion] = React.useState("")
  const [name, setName] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [fbLink, setFbLink] = React.useState("")
  const [error, setError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  const validateIdentifier = (id: string) => {
    return /^[A-Za-z0-9]{5}$/.test(id)
  }

  const validateRegion = (region: string) => {
    return /^[A-Za-z0-9]{3}$/.test(region)
  }

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 5)
    setIdentifier(value)
    setError("")
  }

  const handleRegionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 3)
    setRegion(value)
    setError("")
  }

  const handleSubmit = async () => {
    if (!identifier || !branchType || !region || !name || !location) {
      setError("All fields except Facebook Link are required")
      return
    }

    if (!validateIdentifier(identifier)) {
      setError("Identifier must be exactly 5 alphanumeric characters")
      return
    }

    if (!validateRegion(region)) {
      setError("Region must be exactly 3 alphanumeric characters")
      return
    }

    // Validate Facebook link if provided
    if (fbLink && !fbLink.startsWith('https://') && !fbLink.startsWith('http://')) {
      setError("Facebook link must start with http:// or https://")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Call the API to add the branch
      const newBranch = await addBranch(
        name, 
        location,
        {
          branch_code: identifier,
          type: branchType,
          fb_link: fbLink || null
        }
      )
      
      onBranchAdded({
        branch_id: newBranch.branch_id,
        branch_name: newBranch.branch_name,
        location: newBranch.location,
      })
      
      toast.success("Branch added successfully")
      
      // Reset form
      setIdentifier("")
      setBranchType("B")
      setRegion("")
      setName("")
      setLocation("")
      setFbLink("")
      setError("")
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to add branch:", err)
      if (err instanceof Error) {
        setError(err.message)
        toast.error(`Failed to add branch: ${err.message}`)
      } else {
        setError("Failed to add branch")
        toast.error("Failed to add branch")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl mt-[50px] bg-black border-b border-black text-white [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="border-b border-white items-start text-left mb-[1rem]">
          <DialogTitle className="mb-[1rem]">Add Branch</DialogTitle>
        </DialogHeader>

        {/* Branch ID Construction */}
        <div className="mb-4">
          <Label className="text-white mb-2 block">Branch ID</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder="XXXXX"
                value={identifier}
                onChange={handleIdentifierChange}
                className="bg-white text-black placeholder-gray-400 uppercase text-center"
                maxLength={5}
                disabled={isLoading}
              />
              <small className="text-gray-400 text-xs">5 chars (Branch Code)</small>
            </div>
            <span className="text-white text-xl font-bold">-</span>
            <div className="flex-1">
              <Select value={branchType} onValueChange={setBranchType} disabled={isLoading}>
                <SelectTrigger className="bg-white text-black">
                  <SelectValue placeholder="B" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="W">W</SelectItem>
                </SelectContent>
              </Select>
              <small className="text-gray-400 text-xs">Type (B, or W)</small>
            </div>
            <span className="text-white text-xl font-bold">-</span>
            <div className="flex-1">
              <Input
                placeholder="XXX"
                value={region}
                onChange={handleRegionChange}
                className="bg-white text-black placeholder-gray-400 uppercase text-center"
                maxLength={3}
                disabled={isLoading}
              />
              <small className="text-gray-400 text-xs">3 chars (Location)</small>
            </div>
          </div>
          <div className="mt-1 text-gray-400 text-xs">
            Preview: {identifier && branchType && region ? `${identifier}-${branchType}-${region}` : "XXXXX-B-XXX"}
          </div>
        </div>

        {/* Branch Name, Location, and Facebook Link */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <Label>Branch Name</Label>
            <Input
              placeholder="Enter Branch Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white text-black placeholder-gray-400"
              disabled={isLoading}
            />
          </div>
          <div>
            <Label>Location</Label>
            <Input
              placeholder="Enter Location (e.g., Valenzuela, NCR)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-white text-black placeholder-gray-400"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Facebook Link - Optional */}
        <div className="mt-2">
          <Label>Facebook Link <span className="text-gray-400 text-sm">(optional)</span></Label>
          <Input
            placeholder="https://www.facebook.com/your-page"
            value={fbLink}
            onChange={(e) => setFbLink(e.target.value)}
            className="bg-white text-black placeholder-gray-400"
            disabled={isLoading}
          />
          <small className="text-gray-400 text-xs">
            Optional: Enter the full Facebook page URL
          </small>
        </div>

        {error && (
          <div className="text-[#CE1616] text-sm mt-2">{error}</div>
        )}

        {/* Footer */}
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            className="border-white bg-black text-white hover:bg-white hover:text-black"
            onClick={() => {
              setIdentifier("")
              setBranchType("B")
              setRegion("")
              setName("")
              setLocation("")
              setFbLink("")
              setError("")
              onOpenChange(false)
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#CE1616] hover:bg-[#E64040] text-white"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? "Adding..." : "Add Branch"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
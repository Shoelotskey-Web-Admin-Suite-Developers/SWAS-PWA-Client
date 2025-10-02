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
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

// API utils
import { editAnnouncement } from "@/utils/api/editAnnouncement"
import { deleteAnnouncement } from "@/utils/api/deleteAnnouncement"

export type Announcement = {
  _id: string
  announcement_id: string
  announcement_title: string
  announcement_description: string
  announcement_date: string
}

export function EditAnnouncementDialog({
  open,
  onOpenChange,
  announcement,
  onSave,   // 🔹 now used only as a trigger to refresh
  onDelete, // 🔹 same
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  announcement: Announcement
  onSave?: () => void   // 🔹 no params, just tells parent "refresh now"
  onDelete?: () => void
}) {
  const [form, setForm] = React.useState<Announcement>(announcement)
  const [loading, setLoading] = React.useState(false)

  // Reset form when announcement changes
  React.useEffect(() => {
    setForm(announcement)
  }, [announcement])

  const handleSave = async () => {
    setLoading(true)
    try {
      await editAnnouncement(
        form.announcement_id,              // 🔹 use announcement_id instead of _id
        form.announcement_title,
        form.announcement_description
      )
      onSave?.()             
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to update announcement:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteAnnouncement(form.announcement_id) // 🔹 use announcement_id
      onDelete?.()           
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to delete announcement:", err)
    } finally {
      setLoading(false)
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-y-auto [&>button]:hidden rounded-xl">
        {/* Delete button */}
        <div className="absolute right-5 top-3 flex gap-2">
          <Button
            className="bg-transparent hover:bg-[#CE1616] active:bg-[#E64040] text-black hover:text-white extra-bold"
            size="icon"
            disabled={loading}
            onClick={handleDelete}
          >
            <Trash2 className="w-10 h-10" />
          </Button>
        </div>

        <DialogHeader className="items-start text-left">
          <DialogTitle asChild>
            <h1 className="text-xl font-bold">Edit Announcement</h1>
          </DialogTitle>
        </DialogHeader>

        <hr className="my-3 border-gray-300" />

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <Label>Date Posted</Label>
            <Input
              value={new Date(form.announcement_date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              disabled
            />
          </div>

          <div>
            <Label>Title</Label>
            
            <Input
              value={form.announcement_title}
              onChange={(e) =>
                setForm({ ...form, announcement_title: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={form.announcement_description}
              onChange={(e) =>
                setForm({ ...form, announcement_description: e.target.value })
              }
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            className="extra-bold border"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-500 text-white extra-bold"
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

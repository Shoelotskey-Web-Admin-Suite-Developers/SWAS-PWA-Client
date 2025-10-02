"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { format, isBefore, isAfter, isSameDay, eachDayOfInterval } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

// API utils
import { editPromo } from "@/utils/api/editPromo"
import { deletePromo } from "@/utils/api/deletePromo"

export type Promo = {
  promo_id: string
  promo_title: string
  promo_description: string
  promo_duration: string       // the display string from backend
  promo_dates?: string[]       // raw ISO dates from backend
}

type EditPromoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  promo: Promo
  onSave?: () => void
  onDelete?: () => void
}

export function EditPromoDialog({ open, onOpenChange, promo, onSave, onDelete }: EditPromoDialogProps) {
  const [title, setTitle] = useState(promo.promo_title)
  const [description, setDescription] = useState(promo.promo_description)
  const [dates, setDates] = useState<Date[]>([])
  const [range, setRange] = useState<DateRange>()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setTitle(promo.promo_title)
    setDescription(promo.promo_description)

    // Convert ISO string array to Date[]
    const parsedDates = promo.promo_dates?.map(d => new Date(d)) ?? []
    setDates(parsedDates)

    if (parsedDates.length > 0) {
      setRange({ from: parsedDates[0], to: parsedDates[parsedDates.length - 1] })
    } else {
      setRange(undefined)
    }
  }, [promo])

  const groupContinuousDays = (dates: Date[]): string => {
    if (!dates.length) return "No dates selected"
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
    const groups: Date[][] = []
    let current: Date[] = [sorted[0]]

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      if (diff === 1) current.push(curr)
      else {
        groups.push(current)
        current = [curr]
      }
    }
    groups.push(current)

    return groups
      .map(g =>
        g.length === 1
          ? format(g[0], "MMM d, yyyy")
          : `${format(g[0], "MMM d")}–${format(
              g[g.length - 1],
              g[0].getFullYear() !== g[g.length - 1].getFullYear() ? "MMM d, yyyy" : "d, yyyy"
            )}`
      )
      .join(", ")
  }

  const handleDayClick = (day: Date) => {
    const from = range?.from
    const to = range?.to

    if (!from) {
      setRange({ from: day, to: undefined })
      setDates([day])
      return
    }

    if (from && !to) {
      if (isSameDay(day, from)) {
        setRange(undefined)
        setDates([])
        return
      }
      if (isBefore(day, from)) {
        setRange({ from: day, to: undefined })
        setDates([day])
        return
      }
      const interval = eachDayOfInterval({ start: from, end: day })
      setRange({ from, to: day })
      setDates(interval)
      return
    }

    if (from && to) {
      if (isSameDay(day, from) || isSameDay(day, to)) {
        setRange(undefined)
        setDates([])
        return
      }
      if (isBefore(day, from) || isAfter(day, to)) {
        setRange({ from: day, to: undefined })
        setDates([day])
        return
      }
      setDates(prev => {
        const exists = prev.some(d => isSameDay(d, day))
        return exists ? prev.filter(d => !isSameDay(d, day)) : [...prev, day].sort((a, b) => a.getTime() - b.getTime())
      })
    }
  }

  const handleSave = async () => {
    if (!title || !description || dates.length === 0) {
      return alert("Fill out all fields");
    }

    setLoading(true);
    try {
      await editPromo(
        promo.promo_id,  // promo ID
        title,           // updated title
        description,     // updated description
        dates            // send Date[] directly
      );

      onSave?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to update promo:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deletePromo(promo.promo_id)
      onDelete?.()
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to delete promo:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto [&>button]:hidden rounded-xl p-6 flex flex-col gap-6">
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

        <DialogHeader>
          <DialogTitle>
            <h1 className="text-xl font-bold">Edit Promo Notice</h1>
          </DialogTitle>
        </DialogHeader>

        <hr className="border-gray-300" />

        <div className="space-y-4 flex-1">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div>
            <div className="flex justify-between items-start gap-4">
              <div className="w-[50%]">
                <Label>Selected Dates</Label>
                <p className="text-gray-700">{groupContinuousDays(dates)}</p>
              </div>

              <p className="text-xs text-gray-500 mt-1 text-right">
                Click on dates to add or remove them. All selected dates are shown above.
              </p>
            </div>
            <Calendar
              mode="single"
              selected={range?.from}
              defaultMonth={dates[0] ?? new Date()}
              onDayClick={handleDayClick}
              className="rounded-2xl border-[1px] border-black h-full w-full p-4"
              classNames={{
                caption_label: "m-0 p-0",
                day: "h-[3rem] w-[14.28%] pl-[0.5%] pr-[0.5%] p-0 text-sm",
                day_selected: "border-2 border-[#CE1616]",
                day_today: "bg-gray-200 text-black",
                day_outside: "text-black opacity-50",
              }}
              components={{
                DayButton: ({ day, modifiers, className, ...props }) => {
                  const date = "date" in day ? day.date : day
                  const isOutside = modifiers.outside
                  return (
                    <button
                      className={cn(
                        "h-full w-full text-sm p-0 flex items-center justify-center rounded relative bg-white",
                        className,
                        isOutside ? "opacity-50 text-black" : "text-black"
                      )}
                      {...props}
                    >
                      {date.getDate()}
                    </button>
                  )
                },
              }}
              modifiers={{
                inRange: d => {
                  if (!range?.from || !range?.to) return false
                  return !isBefore(d, range.from) && !isAfter(d, range.to) && dates.some(pd => isSameDay(pd, d))
                },
                rangeStart: d => !!range?.from && isSameDay(d, range.from),
                rangeEnd: d => !!range?.to && isSameDay(d, range.to),
              }}
              modifiersStyles={{
                inRange: { border: "2px dashed #FD8989", color: "black", borderRadius: "6px" },
                rangeStart: { border: "2px solid #e3342f", color: "black", borderRadius: "6px", zIndex: "999" },
                rangeEnd: { border: "2px solid #e3342f", color: "black", borderRadius: "6px" },
              }}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          {onDelete && (
            <Button variant="outline" className="border extra-bold" disabled={loading} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          <Button className="bg-[#CE1616] hover:bg-red-500 text-white extra-bold" disabled={loading} onClick={handleSave}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

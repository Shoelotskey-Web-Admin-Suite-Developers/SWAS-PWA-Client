"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from 'sonner'
import { format, isBefore, isAfter, isSameDay, eachDayOfInterval } from "date-fns"
import type { DateRange } from "react-day-picker"
import { EditAnnouncementDialog, type Announcement as AnnType } from "@/components/user-management/EditAnnouncementDialog"
import { EditPromoDialog} from "@/components/user-management/EditPromoDialog"
import { cn } from "@/lib/utils"

import { getAnnouncements } from "@/utils/api/getAnnouncement"
import { addAnnouncement } from "@/utils/api/addAnnouncement"
import { getPromos } from "@/utils/api/getPromo"
import { addPromo } from "@/utils/api/addPromo"

type Announcement = {
  _id: string   // from MongoDB
  announcement_id: string
  announcement_title: string
  announcement_description: string
  announcement_date: string
}

type Promo = {
  _id: string;
  promo_id: string;
  promo_title: string;
  promo_description?: string | null;
  promo_dates: string[];
  promo_duration: string;
  branch_id: string;
};


export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnType | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const [promos, setPromos] = useState<Promo[]>([])
  const [promoTitle, setPromoTitle] = useState("")
  const [promoDescription, setPromoDescription] = useState("")
  const [promoDates, setPromoDates] = useState<Date[]>([])
  const [promoRange, setPromoRange] = useState<DateRange | undefined>()
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null)
  const [isEditPromoOpen, setIsEditPromoOpen] = useState(false)


  const groupContinuousDays = (dates: Date[]): string => {
    if (dates.length === 0) return ""
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
    const groups: Date[][] = []
    let currentGroup: Date[] = [sorted[0]]

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)

      if (diff === 1) {
        currentGroup.push(curr)
      } else {
        groups.push(currentGroup)
        currentGroup = [curr]
      }
    }
    groups.push(currentGroup)

    return groups
      .map((g) => {
        if (g.length === 1) {
          return format(g[0], "MMM d, yyyy")
        } else {
          return `${format(g[0], "MMM d")}–${format(
            g[g.length - 1],
            g[0].getFullYear() !== g[g.length - 1].getFullYear()
              ? "MMM d, yyyy"
              : "d, yyyy"
          )}`
        }
      })
      .join(", ")
  }

  const fetchAnnouncements = async () => {
    const data = await getAnnouncements()
    setAnnouncements(data)
  }

  const fetchPromos = async () => {
    const data = await getPromos();
    setPromos(data);
  };

  useEffect(() => {
    fetchAnnouncements()
    fetchPromos()
  }, [])

  // ✅ Add new announcement
  const handleAddAnnouncement = async () => {
    if (!newTitle || !newDescription) {
    toast.error("To create an announcement, fill out title and description.")
    return
  }


    setIsPosting(true)
    try {
      const announcement = await addAnnouncement(newTitle, newDescription)
      setAnnouncements((prev) => [announcement, ...prev])
      setNewTitle("")
      setNewDescription("")
      toast.success("Announcement posted!")
    } catch {
      toast.error("Something went wrong while posting.")
    } finally {
      setIsPosting(false)
    }
  }

  const handleDayClick = (day: Date) => {
    const from = promoRange?.from
    const to = promoRange?.to

    if (!from) {
      setPromoRange({ from: day, to: undefined })
      setPromoDates([day])
      return
    }

    if (from && !to) {
      if (isSameDay(day, from)) {
        setPromoRange(undefined)
        setPromoDates([])
        return
      }
      if (isBefore(day, from)) {
        setPromoRange({ from: day, to: undefined })
        setPromoDates([day])
        return
      }
      const days = eachDayOfInterval({ start: from, end: day })
      setPromoRange({ from, to: day })
      setPromoDates(days)
      return
    }

    if (from && to) {
      if (isSameDay(day, from) || isSameDay(day, to)) {
        setPromoRange(undefined)
        setPromoDates([])
        return
      }
      if (isBefore(day, from) || isAfter(day, to)) {
        setPromoRange({ from: day, to: undefined })
        setPromoDates([day])
        return
      }
      setPromoDates((prev) => {
        const exists = prev.some((d) => isSameDay(d, day))
        if (exists) {
          return prev.filter((d) => !isSameDay(d, day))
        } else {
          return [...prev, day].sort((a, b) => a.getTime() - b.getTime())
        }
      })
      return
    }
  }

  const handleAddPromo = async () => {
    if (!promoTitle || promoDates.length === 0) {
      return toast.error("To create a promo notice, fill out all fields first.");
    }

    try {
      // Convert Date[] to ISO string[]
      const dateStrings = promoDates.map((d) => d.toISOString());

      const newPromo = await addPromo(
        promoTitle,
        promoDescription,
        dateStrings // now a string[]
      );

      setPromos((prev) => [newPromo, ...prev]);
      setPromoTitle("");
      setPromoDescription("");
      setPromoDates([]);
      setPromoRange(undefined);
      toast.success("Promo Notice updated!")
    } catch {
      toast.error("Something went wrong while posting the promo.");
    }
  };

  return (
    <div className="p-6 flex flex-col justify-between gap-8" style={{ minHeight: "calc(100dvh - 77px)" }}>
      {/* Create Announcement Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        <Card className="order-1 md:order-2 h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              <h1>Create Announcement</h1>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Title</Label>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Label>Description</Label>
            <Textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={4}
            />
            <Button
              className="bg-[#CE1616] hover:bg-red-500 text-white w-full mt-5 extra-bold disabled:opacity-50"
              onClick={handleAddAnnouncement}
              disabled={isPosting} // ✅ disable while posting
            >
              {isPosting ? "Posting Announcement..." : "Post Announcement"}
            </Button>
          </CardContent>
        </Card>

        {/* Current Announcements */}
        <Card className="order-2 md:order-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-bold"><h1>Current Announcements</h1></CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.length === 0 ? (
              <p className="text-gray-500">No announcements yet.</p>
            ) : (
              announcements.map((a) => (
                <Card
                  key={a._id}
                  className="rounded-xl p-4 flex flex-col justify-between shadow-sm border"
                >
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-gray-500">
                      {new Date(a.announcement_date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <h3 className="font-semibold text-base truncate">{a.announcement_title}</h3>
                    <p className="text-sm text-gray-700 line-clamp-2">{a.announcement_description}</p>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button
                      size="sm"
                      className="border-2 border-[#CE1616] bg-white hover:bg-red-200 text-[#CE1616] extra-bold"
                      onClick={() => {
                        setEditingAnnouncement(a)
                        setIsEditOpen(true)
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {editingAnnouncement && (
        <EditAnnouncementDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          announcement={editingAnnouncement}
          onSave={async () => {
            await fetchAnnouncements()
            toast.success("Announcement updated!")
          }}
          onDelete={async () => {
            await fetchAnnouncements()
            toast.success("Announcement deleted!")
          }}
        />
      )}



      {/* Promos Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        <Card className="order-1 md:order-2 h-fit">
          <CardHeader>
            <CardTitle><h1>Create Promo Notice</h1></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Title</Label>
            <Input value={promoTitle} onChange={(e) => setPromoTitle(e.target.value)} />

            <Label>Duration</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal border-1 border-black rounded-full">
                  {promoDates.length > 0
                    ? groupContinuousDays(promoDates)
                    : "Select dates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-2 space-y-3 w-[282px]">
                <Calendar
                  mode="single"
                  selected={promoRange?.from ?? undefined}
                  onDayClick={handleDayClick}
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
                    inRange: (d: Date) => {
                      if (!promoRange?.from || !promoRange?.to) return false
                      return (
                        !isBefore(d, promoRange.from) &&
                        !isAfter(d, promoRange.to) &&
                        promoDates.some((pd) => isSameDay(pd, d))
                      )
                    },
                    rangeStart: (d: Date) =>
                      !!promoRange?.from && isSameDay(d, promoRange.from),
                    rangeEnd: (d: Date) =>
                      !!promoRange?.to && isSameDay(d, promoRange.to),
                  }}
                  modifiersStyles={{ 
                    inRange: { border: "2px dashed #FD8989", borderRadius: "6px", }, 
                    rangeStart: { border: "2px solid #e3342f", color: "white", borderRadius: "6px", zIndex: "999", }, 
                    rangeEnd: { border: "2px solid #e3342f", color: "white", borderRadius: "6px", }, 
                  }}
                />
                <p className="text-xs text-gray-500">
                  Click start, then end. Click inside to remove/add days.
                  Click outside or on start/end to reset.
                </p>
              </PopoverContent>
            </Popover>

            <Label>Description</Label>
            <Textarea
              value={promoDescription}
              onChange={(e) => setPromoDescription(e.target.value)}
              rows={4}
            />

            <Button
              className="bg-[#CE1616] hover:bg-red-500 text-white w-full mt-5 extra-bold"
              onClick={handleAddPromo}
            >
              Post Promo Notice
            </Button>
          </CardContent>
        </Card>

        <Card className="order-2 md:order-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-bold"><h1>Current Promo Notices</h1></CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {promos.map((p) => (
              <Card key={p.promo_id} className="rounded-xl p-4 flex flex-col justify-between shadow-sm border">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-gray-500">{p.promo_duration}</span>
                  <h3 className="font-semibold text-base">{p.promo_title}</h3>
                  <p className="text-sm text-gray-700">{p.promo_description}</p>
                </div>
                <div className="flex justify-end mt-4">
                  <Button
                    size="sm"
                    className="border-2 border-[#CE1616] bg-white hover:bg-red-200 text-[#CE1616] extra-bold"
                    onClick={() => {
                      setEditingPromo(p)
                      setIsEditPromoOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>

        {editingPromo && (
          <EditPromoDialog
            open={isEditPromoOpen}
            onOpenChange={setIsEditPromoOpen}
            promo={{
              ...editingPromo,
              promo_description: editingPromo.promo_description ?? "", // ✅ fallback to empty string
              promo_dates: editingPromo.promo_dates ?? [] // optional: ensure dates array exists
            }}
            onSave={async () => {
              await fetchPromos(); // reload updated list
              toast.success("Promo Notice updated!")
            }}
            onDelete={async () => {
              await fetchPromos(); // reload after delete
              toast.success("Promo Notice deleted!")
            }}
          />
        )}
      </div>
    </div>
  )
}

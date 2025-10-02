"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// API imports
import { addUnavailability } from "@/utils/api/addUnavailability"
import { cancelAppointmentOnUnavailability } from "@/utils/api/editAppointmentOnUnavailability"
import { getCustomerName } from "@/utils/api/getCustomerName";
import { getUnavailabilityWhole } from "@/utils/api/getUnavailabilityFullDay"
import { getUnavailabilityPartial } from "@/utils/api/getUnavailabilityPartialDay"
import { deleteUnavailability } from "@/utils/api/deleteUnavailability"
import { getAppointmentsApproved } from "@/utils/api/getAppointmentsApproved";
import { useAppointmentUpdates } from "@/hooks/useAppointmentUpdates"
import { useUnavailabilityUpdates } from "@/hooks/useUnavailabilityUpdates"

// Types
interface Appointment {
  id: number
  name: string
  time: string
}

interface Unavailability {
  id: string // 🔹 add id
  date: string
  note: string
  type: "full" | "partial"
  opening?: string
  closing?: string
}

export default function Appointments() {
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date())
  const [inputDate, setInputDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [note, setNote] = useState("")
  const [availabilityType, setAvailabilityType] = useState<"whole" | "custom">("whole")
  const [opening, setOpening] = useState("09:00")
  const [closing, setClosing] = useState("17:00")

  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [pendingUnavailability, setPendingUnavailability] = useState<any>(null)

  const [appointments, setAppointments] = useState<Record<string, Appointment[]>>({});

  const [unavailability, setUnavailability] = useState<Unavailability[]>([])
  
  // Loading states
  const [isLoadingUnavailability, setIsLoadingUnavailability] = useState(true)
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true)
  const [isAddingUnavailability, setIsAddingUnavailability] = useState(false)
  
  // Real-time update indicators
  const [isUpdating, setIsUpdating] = useState(false)

  // Fetch unavailability from API
  const fetchUnavailability = async () => {
    try {
      setIsLoadingUnavailability(true)
      const whole: Unavailability[] = (await getUnavailabilityWhole()).map((u: any) => ({
        id: u.unavailability_id,
        date: u.date_unavailable?.split("T")[0] || "",
        note: u.note || "",
        type: "full" as const,
      }))

      const partial: Unavailability[] = (await getUnavailabilityPartial()).map((u: any) => ({
        id: u.unavailability_id,
        date: u.date_unavailable?.split("T")[0] || "",
        note: u.note || "",
        opening: u.time_start || "",
        closing: u.time_end || "",
        type: "partial" as const,
      }))

      setUnavailability([...whole, ...partial])
    } catch (err) {
      console.error("Failed to fetch unavailability:", err)
    } finally {
      setIsLoadingUnavailability(false)
    }
  }
  
  const fetchAppointments = async () => {
    try {
      setIsLoadingAppointments(true)
      const data = await getAppointmentsApproved();
      const formatted: Record<string, Appointment[]> = {};

      // Prepare a cache so we don't fetch the same customer multiple times
      const customerCache: Record<string, string> = {};

      for (const appt of data) {
        const dateStr = appt.date_for_inquiry?.split("T")[0] || "";
        if (!formatted[dateStr]) formatted[dateStr] = [];

        // Get customer name from cache or API
        let custName = customerCache[appt.cust_id];
        if (!custName) {
          custName = await getCustomerName(appt.cust_id);
          customerCache[appt.cust_id] = custName || appt.cust_id; // fallback to id if name not found
        }

        formatted[dateStr].push({
          id: appt.appointment_id,
          name: custName,
          time: appt.time_start,
        });
      }

      setAppointments(formatted);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setIsLoadingAppointments(false)
    }
  };

  useEffect(() => {
    fetchUnavailability(); // existing unavailability fetch
    fetchAppointments();   // fetch approved appointments
  }, []);

  // subscribe to appointment updates and refresh when they occur
  const { changes: appointmentChanges } = useAppointmentUpdates()
  useEffect(() => {
    if (appointmentChanges) {
      console.log("📢 Real-time appointment update detected:", appointmentChanges.operationType)
      setIsUpdating(true)
      
      // Show toast for significant changes
      if (appointmentChanges.operationType === 'insert') {
        toast.info("New appointment added", { duration: 2000 })
      } else if (appointmentChanges.operationType === 'update') {
        toast.info("Appointment updated", { duration: 2000 })
      } else if (appointmentChanges.operationType === 'delete') {
        toast.info("Appointment removed", { duration: 2000 })
      }
      
      const t = setTimeout(() => {
        fetchAppointments().finally(() => setIsUpdating(false))
      }, 300)
      return () => clearTimeout(t)
    }
  }, [appointmentChanges])

  // subscribe to unavailability updates and refresh when they occur
  const { changes: unavailabilityChanges } = useUnavailabilityUpdates()
  useEffect(() => {
    if (unavailabilityChanges) {
      console.log("📢 Real-time unavailability update detected:", unavailabilityChanges.operationType)
      setIsUpdating(true)
      
      // Show toast for unavailability changes
      if (unavailabilityChanges.operationType === 'insert') {
        toast.info("New unavailability period added", { duration: 2000 })
      } else if (unavailabilityChanges.operationType === 'update') {
        toast.info("Unavailability period updated", { duration: 2000 })
      } else if (unavailabilityChanges.operationType === 'delete') {
        toast.info("Unavailability period removed", { duration: 2000 })
      }
      
      const t = setTimeout(async () => {
        try {
          await fetchUnavailability()
          // Also refresh appointments in case unavailability changes affected them
          await fetchAppointments()
        } finally {
          setIsUpdating(false)
        }
      }, 300)
      return () => clearTimeout(t)
    }
  }, [unavailabilityChanges])

  // Convert 24-hour time to 12-hour AM/PM
  const formatAMPM = (hour: number, minute: number) => {
    const ampm = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return `${h}:${minute.toString().padStart(2, "0")} ${ampm}`;
  }

  // Generate time slots in AM/PM
  const generateTimeSlots = () => {
    const slots: string[] = [];
    const slots24: string[] = [];
    let start = 6 * 60;
    const end = 22 * 60;

    while (start < end) {
      const h = Math.floor(start / 60);
      const m = start % 60;
      const next = start + 30;
      const h2 = Math.floor(next / 60);
      const m2 = next % 60;

      slots.push(`${formatAMPM(h, m)} - ${formatAMPM(h2, m2)}`);
      slots24.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      start = next;
    }

    return { slots, slots24 };
  }

  const { slots: timeSlots, slots24: timeSlots24 } = generateTimeSlots();

  // Helper to round a time string to nearest 30 minutes
  const roundTo30Min = (time: string) => {
    const [h, m] = time.split(":").map(Number)
    let minutes = h * 60 + m
    minutes = Math.round(minutes / 30) * 30
    const newH = Math.floor(minutes / 60)
    const newM = minutes % 60
    return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`
  }
  
  const toLocalDateString = (d?: Date) => {
    if (!d) return ""; // handle undefined
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const getDayBg = (date: Date) => {
    const dateStr = toLocalDateString(date)
    const hasFull = unavailability.some(u => u.date === dateStr && u.type === "full")
    const hasPartial = unavailability.some(u => u.date === dateStr && u.type === "partial")
    const apptCount = appointments[dateStr]?.length || 0

    if (hasFull) return "bg-gray-300 text-gray-500" // full-day blocks everything

    if (hasPartial) {
      // partial + appointments
      if (apptCount === 0) return "bg-white text-black opacity-60"; // only partial
      if (apptCount > 0 && apptCount <= 3) return "bg-red-100 text-black opacity-60";
      if (apptCount > 3 && apptCount <= 6) return "bg-red-300 text-black opacity-60";
      if (apptCount > 6) return "bg-red-500 text-white";
      return "bg-white text-gray-500 opacity-60"; // fallback for partial only
    }

    // normal appointment colors
    if (apptCount === 0) return "bg-white text-black";
    if (apptCount > 0 && apptCount <= 3) return "bg-red-100 text-black";
    if (apptCount > 3 && apptCount <= 6) return "bg-red-300 text-black";
    return "bg-red-500 text-white"; // more than 6
  }


  const formatDayTitle = (date?: Date) => {
    if (!date) return ""
    const options: Intl.DateTimeFormatOptions = { weekday: "long", month: "short", day: "numeric" }
    return date.toLocaleDateString("en-US", options)
  }

  // Add unavailability handler
  const handleAddUnavailability = async () => {
    if (!inputDate) return
    const dateStr = new Date(inputDate).toISOString().split("T")[0]
    const type = availabilityType === "whole" ? "Full Day" : "Partial Day"

    // Check if any appointments exist on that day
    const affectedAppointments = appointments[dateStr]?.length || 0

    // If appointments exist, show alert dialog
    if (affectedAppointments > 0) {
      setPendingUnavailability({
        date: dateStr,
        type,
        opening: type === "Partial Day" ? opening : undefined,
        closing: type === "Partial Day" ? closing : undefined,
        note,
      })
      setShowCancelDialog(true)
      return
    }

    // No affected appointments, just add
    try {
      setIsAddingUnavailability(true)
      await addUnavailability(dateStr, type, type === "Partial Day" ? opening : undefined, type === "Partial Day" ? closing : undefined, note)
      await fetchUnavailability()
      setNote("")
      setOpening("09:00")
      setClosing("17:00")
      
      // Show success message
      toast.success("Unavailability added successfully.", {
        description: "No existing appointments were affected.",
        duration: 3000
      })
    } catch (err) {
      console.error("Failed to add unavailability:", err)
      toast.error("Failed to add unavailability. Please try again.")
    } finally {
      setIsAddingUnavailability(false)
    }
  }

  const handleConfirmCancelAppointments = async () => {
    if (!pendingUnavailability) return;

    try {
      // 1️⃣ Cancel affected appointments
      await cancelAppointmentOnUnavailability({
        date_unavailable: pendingUnavailability.date,
        type: pendingUnavailability.type,
        time_start: pendingUnavailability.opening,
        time_end: pendingUnavailability.closing,
      });

      // 2️⃣ Add the unavailability
      await addUnavailability(
        pendingUnavailability.date,
        pendingUnavailability.type,
        pendingUnavailability.opening,
        pendingUnavailability.closing,
        pendingUnavailability.note
      );

      // 3️⃣ Refresh UI
      await fetchUnavailability();
      await fetchAppointments(); // 🔹 Refresh appointments to update calendar/time slots
      setPendingUnavailability(null);
      setShowCancelDialog(false);
      setNote("");
      setOpening("09:00");
      setClosing("17:00");

      // 4️⃣ Show success message with notification info
      const affectedAppointments = appointments[pendingUnavailability.date]?.length || 0;
      if (affectedAppointments > 0) {
        toast.success(
          `Unavailability added and ${affectedAppointments} appointment${affectedAppointments > 1 ? 's' : ''} cancelled.`,
          {
            description: "Affected customers have been notified via push notification about the cancellation.",
            duration: 5000
          }
        );
      } else {
        toast.success("Unavailability added successfully.");
      }
    } catch (err) {
      console.error("Failed to add unavailability and cancel appointments:", err);
      toast.error("Failed to add unavailability. Please try again.");
    }
  }


  // Delete unavailability handler
  const handleDeleteUnavailability = async (unv: Unavailability) => {
    try {
      await deleteUnavailability(unv.id);
      // remove from local state instantly
      setUnavailability(prev => prev.filter(u => u.id !== unv.id));
    } catch (err) {
      console.error("Failed to delete unavailability:", err);
      alert("Failed to delete unavailability");
    }
  };


  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 w-full h-full">
      {/* Real-time Update Indicator */}
      {isUpdating && (
        <div className="fixed top-20 right-4 z-50 bg-blue-500 text-white px-3 py-1 rounded-md shadow-lg text-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Updating...
        </div>
      )}
      {/* Calendar */}
      <div className="md:col-span-2 w-full h-full">
        <Calendar
          mode="single"
          selected={calendarDate}
          onSelect={setCalendarDate}
          className="rounded-2xl border-[1px] border-[#C7C7C7] h-full w-full p-[2rem]"
          classNames={{
            caption_label: "text-2xl bold text-center mb-2",
            day: "h-[3rem] w-[14.28%] pl-[0.5%] pr-[0.5%] p-0 text-sm",
            day_selected: "border-2 border-[#CE1616]",
            day_today: "bg-gray-200 text-black",
            day_outside: "text-gray-400 opacity-50",
          }}
          components={{
            DayButton: ({ day, modifiers, className, ...props }) => {
              const date = "date" in day ? day.date : day
              const bgClass = getDayBg(date)
              return (
                <button
                  className={cn(
                    "h-full w-full text-sm p-0 flex items-center justify-center rounded relative",
                    bgClass,
                    modifiers.today && !modifiers.selected
                      ? "before:absolute before:-inset-0.5 before:rounded-full before:border-2 before:border-[#FD8989]"
                      : "",
                    modifiers.selected ? "border-2 border-[#CE1616]" : "",
                    className
                  )}
                  {...props}
                >
                  {date.getDate()}
                </button>
              )
            },
          }}
        />
      </div>

      {/* Time Slots */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex justify-between items-center w-full">
              <h1>Time Slot</h1>
              <h3 className="regular text-gray-500">{formatDayTitle(calendarDate)}</h3>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {timeSlots.map((slot, idx) => {
                const slotStart24 = timeSlots24[idx];
                const todaysAppointments = appointments[toLocalDateString(calendarDate!)]?.filter(a =>
                  a.time === slotStart24
                ) || []

                return (
                  <div
                    key={slot}
                    className={`p-2 rounded-md ${todaysAppointments.length > 0 ? "bg-red-200" : "bg-gray-100"}`}
                  >
                    <div className="flex justify-between text-sm font-medium">
                      <span>{slot}</span>
                      <span>{todaysAppointments.length}/3</span>
                    </div>
                    {todaysAppointments.length > 0 && (
                      <div className="text-xs mt-1">
                        {todaysAppointments.map(a => a.name).join(", ")}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Manage Availability */}
      <Card className="grid-cols-1 md:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle><h1>Manage Availability</h1></CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[0.5fr_0.25fr_0.25fr] gap-4">
          {/* Left Side: Date, Note, Type, Confirm */}
          <div className="grid grid-cols-1 md:col-span-2 lg:col-span-1 gap-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-1 gap-1">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)} // update state when user edits
                  />
                </div>
                <div>
                  <Label>Note</Label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Type</Label>
                <RadioGroup value={availabilityType} onValueChange={(v: "whole" | "custom") => setAvailabilityType(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="whole" id="whole" />
                    <Label htmlFor="whole">Whole Day</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom">Custom Hours</Label>
                  </div>
                </RadioGroup>
                {availabilityType === "custom" && (
                  <div className="grid grid-cols-2 gap-2 mt-5">
                    <Input
                      type="time"
                      value={opening}
                      onChange={(e) => setOpening(e.target.value)}
                      onBlur={() => setOpening(roundTo30Min(opening))} // round when losing focus
                    />
                    <Input
                      type="time"
                      value={closing}
                      onChange={(e) => setClosing(e.target.value)}
                      onBlur={() => setClosing(roundTo30Min(closing))} // round when losing focus
                    />
                  </div>
                )}
              </div>
            </div>

            <Button 
              onClick={handleAddUnavailability} 
              disabled={isAddingUnavailability || isLoadingAppointments || isLoadingUnavailability}
              className="mt-4 bg-[#CE1616] hover:bg-red-500 text-white extra-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAddingUnavailability ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Adding...</span>
                </div>
              ) : (
                "Confirm"
              )}
            </Button>
          </div>

          {/* Full Day Table */}
          <div>
            <h3 className="font-semibold mb-2">Full-Day Unv</h3>
            <ScrollArea className="h-32 border rounded-md bg-[#F0F0F0]">
              <div className="p-2 space-y-2">
                {isLoadingUnavailability ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                  </div>
                ) : (
                  unavailability
                    .filter(u => u.type === "full")
                    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
                    .map(u => (
                      <div key={u.id} className="grid grid-cols-[1fr_2fr_auto] items-center text-sm bg-[#F0F0F0] border-b-2 border-[#C7C7C7] p-1">
                        <span className="font-medium">{u.date}</span>
                        <span>{u.note}</span>
                        <Trash2 onClick={() => handleDeleteUnavailability(u)} className="w-4 h-4 text-red-600 cursor-pointer justify-self-end" />
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Partial Day Table */}
          <div>
            <h3 className="font-semibold mb-2">Partial-Day Unv</h3>
            <ScrollArea className="h-32 border rounded-md bg-[#F0F0F0]">
              <div className="p-2 space-y-2">
                {isLoadingUnavailability ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                  </div>
                ) : (
                  unavailability
                    .filter(u => u.type === "partial")
                    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
                    .map(u => (
                      <div key={u.id} className="grid grid-cols-[1fr_1fr_2fr_auto] items-center text-sm bg-[#F0F0F0] border-b-2 border-[#C7C7C7] p-1">
                        <span className="font-medium">{u.date}</span>
                        <span>{u.opening || "--"} - {u.closing || "--"}</span>
                        <span>{u.note}</span>
                        <Trash2 onClick={() => handleDeleteUnavailability(u)} className="w-4 h-4 text-red-600 cursor-pointer justify-self-end" />
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <h3>Appointments Will Be Affected</h3>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p>
                Adding this unavailability will cancel affected existing appointments on this day.
              </p>
              <div className="mt-3 p-3 bg-blue-50 rounded-md border-l-4 border-blue-400">
                <p className="text-sm text-blue-800">
                  📱 <strong>Customers will be automatically notified</strong> via push notifications about the cancellation and the reason for unavailability.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <h5 className="extra-bold">Cancel</h5>
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#CE1616] hover:bg-[#b31212] text-white"
              onClick={() => {
                handleConfirmCancelAppointments();
                setShowCancelDialog(false); // close dialog after confirm
              }}
            >
              <h5 className="extra-bold">Continue</h5>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
</AlertDialog>
    </div>
  )
}

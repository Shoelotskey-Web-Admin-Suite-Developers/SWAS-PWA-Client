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
import { Trash2, Phone } from "lucide-react"
import { cn } from "@/lib/utils"

// Simple Tooltip component
function Tooltip({ children, content }: { children: React.ReactNode, content: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      {children}
      {visible && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 min-w-[180px] bg-white border border-gray-300 shadow-lg rounded p-2 text-xs text-gray-800 whitespace-pre-wrap pointer-events-none">
          {content}
        </div>
      )}
    </span>
  );
}
import { toast } from "sonner"

// API imports
import { addUnavailability } from "@/utils/api/addUnavailability"
import { cancelAppointmentOnUnavailability } from "@/utils/api/editAppointmentOnUnavailability"
import { getCustomerName } from "@/utils/api/getCustomerName";
import { getCustomerContact } from "@/utils/api/getCustomerContact";
import { getUnavailabilityWhole } from "@/utils/api/getUnavailabilityFullDay"
import { getUnavailabilityPartial } from "@/utils/api/getUnavailabilityPartialDay"
import { deleteUnavailability } from "@/utils/api/deleteUnavailability"
import { getAppointmentsApproved } from "@/utils/api/getAppointmentsApproved";
import { updateCustomerCredibility } from "@/utils/api/updateCustomerCredibility";
import { updateAppointmentAttendance } from "@/api/updateAppointmentAttendance";
import { useAppointmentUpdates } from "@/hooks/useAppointmentUpdates"
import { useUnavailabilityUpdates } from "@/hooks/useUnavailabilityUpdates"

// Types
interface Appointment {
  id: number
  customerId: string
  name: string
  time: string
  contact?: string
  attendance_status?: "Verified" | "Missed" | null
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

  // Selection state for verification
  const [selectedAppointments, setSelectedAppointments] = useState<Set<number>>(new Set())
  const [isProcessingCredibility, setIsProcessingCredibility] = useState(false)

  // Toggle appointment selection
  const toggleAppointmentSelection = (appointmentId: number) => {
    setSelectedAppointments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(appointmentId)) {
        newSet.delete(appointmentId)
      } else {
        newSet.add(appointmentId)
      }
      return newSet
    })
  }

  // Clear all selections
  const clearSelections = () => {
    setSelectedAppointments(new Set())
  }

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
      const contactCache: Record<string, string> = {};

      for (const appt of data) {
        const dateStr = appt.date_for_inquiry?.split("T")[0] || "";
        if (!formatted[dateStr]) formatted[dateStr] = [];

        // Get customer name from cache or API
        let custName = customerCache[appt.cust_id];
        if (!custName) {
          custName = await getCustomerName(appt.cust_id);
          customerCache[appt.cust_id] = custName || appt.cust_id; // fallback to id if name not found
        }

        // Get customer contact from cache or API
        let custContact = contactCache[appt.cust_id];
        if (!custContact) {
          custContact = await getCustomerContact(appt.cust_id) || "";
          contactCache[appt.cust_id] = custContact;
        }

        formatted[dateStr].push({
          id: appt.appointment_id,
          customerId: appt.cust_id,
          name: custName,
          time: appt.time_start,
          contact: custContact,
          attendance_status: appt.attendance_status,
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

  // Handle verify arrival button
  const handleVerifyArrival = async () => {
    if (selectedAppointments.size === 0) return;

    setIsProcessingCredibility(true);
    try {
      const selectedIds = Array.from(selectedAppointments);
      const allAppointments = Object.values(appointments).flat();
      
      // Get customer IDs for selected appointments
      const customerIds = selectedIds
        .map(id => allAppointments.find(appt => appt.id === id)?.customerId)
        .filter(Boolean) as string[];

      // Update attendance status in database
      await updateAppointmentAttendance(selectedIds.map(String), "Verified");

      // Update credibility for each customer
      const results = await Promise.allSettled(
        customerIds.map(custId => updateCustomerCredibility(custId, "verify_arrival"))
      );

      // Count successes and failures
      const successful = results.filter(r => r.status === "fulfilled").length;
      const failed = results.filter(r => r.status === "rejected").length;

      if (successful > 0) {
        toast.success(
          `✅ ${successful} customer${successful > 1 ? 's' : ''} verified`,
          {
            description: `Credibility increased by 7 points. ${failed > 0 ? `${failed} failed.` : ''}`,
            duration: 4000
          }
        );
      }

      if (failed > 0 && successful === 0) {
        toast.error("Failed to verify arrivals. Please try again.");
      }

      // Refresh appointments to show updated attendance status
      await fetchAppointments();

      // Clear selections after processing
      clearSelections();
    } catch (err) {
      console.error("Error verifying arrivals:", err);
      toast.error("An error occurred while verifying arrivals.");
    } finally {
      setIsProcessingCredibility(false);
    }
  };

  // Handle flag as missed button
  const handleFlagAsMissed = async () => {
    if (selectedAppointments.size === 0) return;

    setIsProcessingCredibility(true);
    try {
      const selectedIds = Array.from(selectedAppointments);
      const allAppointments = Object.values(appointments).flat();
      
      // Get customer IDs and names for selected appointments
      const customersData = selectedIds
        .map(id => {
          const appt = allAppointments.find(appt => appt.id === id);
          return appt ? { custId: appt.customerId, name: appt.name } : null;
        })
        .filter(Boolean) as { custId: string; name: string }[];

      // Update attendance status in database
      await updateAppointmentAttendance(selectedIds.map(String), "Missed");

      // Update credibility for each customer
      const results = await Promise.allSettled(
        customersData.map(({ custId }) => updateCustomerCredibility(custId, "flag_missed"))
      );

      // Check which customers are now blocked
      const blockedCustomers = results
        .map((result, idx) => {
          if (result.status === "fulfilled" && !result.value.canBook) {
            return customersData[idx].name;
          }
          return null;
        })
        .filter(Boolean);

      const successful = results.filter(r => r.status === "fulfilled").length;
      const failed = results.filter(r => r.status === "rejected").length;

      if (successful > 0) {
        toast.warning(
          `⚠️ ${successful} customer${successful > 1 ? 's' : ''} flagged as missed`,
          {
            description: `Credibility decreased by 10 points. ${
              blockedCustomers.length > 0 
                ? `🚫 ${blockedCustomers.join(", ")} ${blockedCustomers.length > 1 ? 'are' : 'is'} now blocked from booking.` 
                : ''
            }${failed > 0 ? ` ${failed} failed.` : ''}`,
            duration: 6000
          }
        );
      }

      if (failed > 0 && successful === 0) {
        toast.error("Failed to flag appointments. Please try again.");
      }

      // Refresh appointments to show updated attendance status
      await fetchAppointments();

      // Clear selections after processing
      clearSelections();
    } catch (err) {
      console.error("Error flagging missed appointments:", err);
      toast.error("An error occurred while flagging missed appointments.");
    } finally {
      setIsProcessingCredibility(false);
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
      <div className="md:col-span-2 w-full h-full flex flex-col gap-4">
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
                const date = "date" in day ? day.date : day;
                const bgClass = getDayBg(date);
                const dateStr = toLocalDateString(date);
                const todaysAppointments = appointments[dateStr] || [];
                // Tooltip content
                const tooltipContent = todaysAppointments.length > 0
                  ? (
                      <div>
                        <div className="font-semibold mb-1">Appointments:</div>
                        <ul className="list-disc pl-4">
                          {todaysAppointments.map(a => (
                            <li key={a.id}>{a.name} <span className="text-gray-500">({a.time})</span></li>
                          ))}
                        </ul>
                      </div>
                    )
                  : <span className="text-gray-500">No appointments</span>;
                return (
                  <Tooltip content={tooltipContent}>
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
                  </Tooltip>
                );
              },
          }}
        />
        
        {/* Calendar Legend */}
        <Card className="p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Calendar Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
                <span>Available (0 appointments)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-gray-300 rounded"></div>
                <span>Light booking (1-3 appointments)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-300 border border-gray-300 rounded"></div>
                <span>Moderate booking (4-6 appointments)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 border border-gray-300 rounded"></div>
                <span>Heavy booking (7+ appointments)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border border-gray-300 rounded opacity-60"></div>
                <span>Partial unavailability</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-300 border border-gray-300 rounded"></div>
                <span>Full day unavailable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border-2 border-[#FD8989] rounded-full"></div>
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border-2 border-[#CE1616] rounded"></div>
                <span>Selected date</span>
              </div>
            </div>
          </CardContent>
        </Card>
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
        <CardContent className="flex flex-col gap-3">
          <ScrollArea className="h-[350px]">
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
                      <div className="text-xs mt-1 space-y-1">
                        {todaysAppointments.map(a => {
                          const isSelected = selectedAppointments.has(a.id)
                          const isProcessed = a.attendance_status !== null && a.attendance_status !== undefined
                          const isVerified = a.attendance_status === "Verified"
                          const isMissed = a.attendance_status === "Missed"
                          
                          return (
                            <div 
                              key={a.id} 
                              className={cn(
                                "flex items-center gap-1.5 p-2 rounded transition-all",
                                isProcessed && "opacity-60 cursor-not-allowed",
                                !isProcessed && "cursor-pointer",
                                !isProcessed && isSelected && "bg-blue-100 border-2 border-blue-500",
                                !isProcessed && !isSelected && "hover:bg-white hover:bg-opacity-50",
                                isVerified && "bg-green-50 border border-green-300",
                                isMissed && "bg-red-50 border border-red-300"
                              )}
                              onClick={() => !isProcessed && toggleAppointmentSelection(a.id)}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isProcessed}
                                onChange={() => {}} // Handled by parent div click
                                className={cn(
                                  "w-3 h-3",
                                  isProcessed ? "cursor-not-allowed" : "cursor-pointer"
                                )}
                              />
                              <span className={cn(
                                "font-medium",
                                isVerified && "text-green-700",
                                isMissed && "text-red-700 line-through"
                              )}>
                                {a.name}
                                {isVerified && " ✓"}
                                {isMissed && " ✗"}
                              </span>
                              <span className="text-gray-500">•</span>
                              <div className="flex items-center gap-1 text-gray-600">
                                <Phone className="w-3 h-3" />
                                <span>{a.contact || "No contact"}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          {/* Verification Action Buttons */}
          <div className="border-t pt-3 space-y-2">
            <div className="text-xs text-gray-500 mb-2">
              {selectedAppointments.size > 0 
                ? `${selectedAppointments.size} appointment${selectedAppointments.size > 1 ? 's' : ''} selected`
                : "Select appointments to verify or flag"
              }
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                disabled={selectedAppointments.size === 0 || isProcessingCredibility}
                className="op-btn op-btn-rd bg-[#CE1616] hover:bg-[#e04a4a] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={handleVerifyArrival}
              >
                {isProcessingCredibility ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    <span className="text-sm font-medium">Processing...</span>
                  </div>
                ) : (
                  <span className="text-sm font-medium">✓ Verify Arrival</span>
                )}
              </Button>
              <Button
                disabled={selectedAppointments.size === 0 || isProcessingCredibility}
                className="op-btn bg-black hover:bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={handleFlagAsMissed}
              >
                {isProcessingCredibility ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    <span className="text-sm font-medium">Processing...</span>
                  </div>
                ) : (
                  <span className="text-sm font-medium">⚠ Flag as Missed</span>
                )}
              </Button>
            </div>
            {selectedAppointments.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-sm font-medium"
                onClick={clearSelections}
                disabled={isProcessingCredibility}
              >
                Clear Selection
              </Button>
            )}
          </div>
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

      <hr className="mt-3" />

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

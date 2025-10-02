import { useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"

const BASE_URL = import.meta.env.VITE_API_BASE_URL

interface ChangeEvent {
  operationType: string
  documentKey: { _id: string }
  fullDocument?: any
  updateDescription?: {
    updatedFields: Record<string, any>
    removedFields: string[]
  }
}

export function useAppointmentUpdates() {
  const [changes, setChanges] = useState<ChangeEvent | null>(null)

  useEffect(() => {
    const socket: Socket = io(BASE_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    })

    socket.on("connect", () => {
      console.log("🔌 Connected to socket server (appointments):", socket.id)
    })

    socket.on("appointmentUpdated", (change: ChangeEvent) => {
      console.log("📢 Appointment change received:", change)
      setChanges(change)
    })

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from socket server (appointments)")
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return { changes }
}

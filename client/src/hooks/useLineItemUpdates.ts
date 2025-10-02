// src/hooks/useLineItemUpdates.ts
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ChangeEvent {
  operationType: string;
  documentKey: { _id: string };
  fullDocument?: any;
  updateDescription?: {
    updatedFields: Record<string, any>;
    removedFields: string[];
  };
}

export function useLineItemUpdates() {
  const [changes, setChanges] = useState<ChangeEvent | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let socket: Socket;
    let reconnectTimer: NodeJS.Timeout;

    const connectSocket = () => {
      socket = io(BASE_URL, {
        transports: ["websocket", "polling"],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on("connect", () => {
        console.log("🔌 Connected to socket server:", socket.id);
        setIsConnected(true);
      });

      socket.on("lineItemUpdated", (change: ChangeEvent) => {
        console.log("📢 Line item change received:", change);
        setChanges(change);
        setLastUpdate(new Date());
      });

      socket.on("disconnect", () => {
        console.log("❌ Disconnected from socket server");
        setIsConnected(false);
      });

      socket.on("connect_error", (err) => {
        console.error("Connection error:", err);
        setIsConnected(false);
      });
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, []);

  return { changes, isConnected, lastUpdate };
}

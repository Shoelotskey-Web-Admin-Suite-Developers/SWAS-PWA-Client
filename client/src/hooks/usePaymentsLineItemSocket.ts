// Hook: usePaymentsLineItemSocket
// Listens to the existing `lineItemUpdated` socket event and invokes a callback
// with the parsed change stream event so the Payments page can update its UI.
// Specifically we care about updates where a line item's current_status becomes
// "Picked Up" – in that case the line item (or its parent request if no more
// line items remain) should be removed from the payments table in real-time.

import { useEffect, useRef, useState } from "react";
import { getSocket, Socket } from "@/lib/socket";

export interface LineItemChangeEvent {
  operationType: string;
  documentKey: { _id: string };
  fullDocument?: any; // present for inserts, deletes (null), and with updateLookup enabled
  updateDescription?: {
    updatedFields: Record<string, any>;
    removedFields: string[];
  };
}

type Options = {
  onPickedUp?: (lineItemId: string, fullDocument?: any) => void; // fired when a line item becomes Picked Up
  onUpdate?: (lineItemId: string, change: LineItemChangeEvent, updatedFields: Record<string, any>, fullDocument?: any) => void; // fired for any update
  onAnyChange?: (evt: LineItemChangeEvent) => void; // optional general listener
  // allow opt-out or custom test for picked up status
  isPickedUpStatus?: (status: string) => boolean;
};

export function usePaymentsLineItemSocket(opts: Options) {
  const { onPickedUp, onUpdate, onAnyChange, isPickedUpStatus = (s) => s === "Picked Up" } = opts;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEventTs, setLastEventTs] = useState<number | null>(null);
  // Refs to always have latest callbacks without re-subscribing socket listener
  const pickedUpRef = useRef<typeof onPickedUp | undefined>(undefined);
  const updateRef = useRef<typeof onUpdate | undefined>(undefined);
  const anyChangeRef = useRef<typeof onAnyChange | undefined>(undefined);
  const isPickedUpRef = useRef(isPickedUpStatus);

  pickedUpRef.current = onPickedUp;
  updateRef.current = onUpdate;
  anyChangeRef.current = onAnyChange;
  isPickedUpRef.current = isPickedUpStatus;

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const connectHandler = () => setIsConnected(true);
    const disconnectHandler = () => setIsConnected(false);
    socket.on("connect", connectHandler);
    socket.on("disconnect", disconnectHandler);
    socket.on("connect_error", disconnectHandler);

    const handleChange = (change: LineItemChangeEvent) => {
      try {
        setLastEventTs(Date.now());
        anyChangeRef.current?.(change);

        // Prioritize documentKey._id (always present) then potential alias fields
        const lineItemId = change.documentKey?._id
          || change.fullDocument?.line_item_id
          || change.fullDocument?._id;

        if (!lineItemId) return;

        if (change.operationType === 'update') {
          const updatedFields = change.updateDescription?.updatedFields || {};
          updateRef.current?.(String(lineItemId), change, updatedFields, change.fullDocument);
          const updatedStatus = updatedFields.current_status
            ?? change.fullDocument?.current_status
            ?? updatedFields.status
            ?? change.fullDocument?.status;
            if (updatedStatus && isPickedUpRef.current(String(updatedStatus))) {
              pickedUpRef.current?.(String(lineItemId), change.fullDocument);
            }
        } else if (change.operationType === 'replace' || change.operationType === 'insert') {
          const status = change.fullDocument?.current_status || change.fullDocument?.status;
          if (status && isPickedUpRef.current(String(status))) {
            pickedUpRef.current?.(String(lineItemId), change.fullDocument);
          } else {
            updateRef.current?.(String(lineItemId), change, change.fullDocument || {}, change.fullDocument);
          }
        }
      } catch (err) {
        console.debug("usePaymentsLineItemSocket: error processing change", err);
      }
    };

    socket.on("lineItemUpdated", handleChange);
    // Slim delta event (new) for simpler real-time updates
    const handleDelta = (delta: any) => {
      try {
        setLastEventTs(Date.now());
        const id = delta.line_item_id || delta._id;
        if (!id) return;
        // mimic onUpdate semantics with available info
        updateRef.current?.(String(id), delta, delta.updatedFields || {}, delta);
        const status = delta.current_status;
        if (status && isPickedUpRef.current(String(status))) {
          pickedUpRef.current?.(String(id), delta);
        }
      } catch (e) {
        console.debug("usePaymentsLineItemSocket: error processing delta", e);
      }
    };
    socket.on("lineItemDelta", handleDelta);

    return () => {
  socket.off("lineItemUpdated", handleChange);
  socket.off("lineItemDelta", handleDelta);
      socket.off("connect", connectHandler);
      socket.off("disconnect", disconnectHandler);
      socket.off("connect_error", disconnectHandler);
      // keep shared socket alive
    };
  }, []);

  return { isConnected, lastEventTs };
}

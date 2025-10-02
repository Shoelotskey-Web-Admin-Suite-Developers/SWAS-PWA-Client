import React, { createContext, useContext, useEffect, useState } from "react";
import { getLineItems } from "@/utils/api/getLineItems";
import { getCustomerContact } from "@/utils/api/getCustomerContact";
import { getPaymentStatus } from "@/utils/api/getPaymentStatus";
import { computePickupAllowance } from "@/utils/computePickupAllowance";

type Branch = "Valenzuela" | "SM Valenzuela" | "SM Grand";
type Row = {
  lineItemId: string;
  date: Date;
  customer: string;
  shoe: string;
  service: string;
  branch: Branch;
  pickupNotice?: Date | null;
  allowanceDays: number;
  paymentStatus: "Paid" | "Unpaid" | "Partial";
  contact: string;
};

const PickupContext = createContext<Row[]>([]);

export const usePickupRows = () => useContext(PickupContext);

export function PickupProvider({ children }: { children: React.ReactNode }) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const fetchRows = async () => {
      const items = await getLineItems("Ready for Pickup");
      const mappedRows: Row[] = await Promise.all(
        items.map(async (item: any) => {
          const contact = await getCustomerContact(item.cust_id) ?? "";
          const paymentStatusRaw = await getPaymentStatus(item.transaction_id);
          let paymentStatus: "Paid" | "Unpaid" | "Partial" = "Unpaid";
          if (paymentStatusRaw === "PAID") paymentStatus = "Paid";
          else if (paymentStatusRaw === "PARTIAL") paymentStatus = "Partial";
          const pickupNotice = item.pickUpNotice ? new Date(item.pickUpNotice) : null;
          const allowanceDays = computePickupAllowance(pickupNotice);
          return {
            lineItemId: item.line_item_id,
            date: new Date(item.latest_update),
            customer: item.cust_id,
            shoe: item.shoes,
            service: Array.isArray(item.services) && item.services.length > 0
              ? item.services.map((s: any) => s.service_id).join(", ")
              : "",
            branch: item.branch_id as Branch,
            pickupNotice,
            allowanceDays,
            paymentStatus,
            contact,
          };
        })
      );
      setRows(mappedRows);
    };
    fetchRows();
  }, []);

  return (
    <PickupContext.Provider value={rows}>
      {children}
    </PickupContext.Provider>
  );
}
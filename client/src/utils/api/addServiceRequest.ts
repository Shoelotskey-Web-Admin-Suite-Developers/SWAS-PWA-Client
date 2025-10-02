// src/utils/api/addServiceRequest.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface ServiceQuantity {
  service_id: string;
  quantity: number;
}

export interface LineItemInput {
  services: ServiceQuantity[]; // required: [{ service_id, quantity }]
  priority: "Rush" | "Normal";
  shoes: string;
  current_location: "Hub" | "Branch";
  storage_fee?: number;
  due_date?: string | Date | null;
  before_img?: string | null;
  after_img?: string | null;
}

export interface ServiceRequestInput {
  cust_id?: string; // optional if existing (server currently matches by name+bdate)
  cust_name: string;
  cust_bdate?: string | null;
  cust_address?: string | null;
  cust_email?: string | null;
  cust_contact?: string | null;
  received_by: string;
  lineItems: LineItemInput[];
  total_amount: number;
  discount_amount: number;
  amount_paid: number;
  payment_status: "NP" | "PARTIAL" | "PAID";
  payment_mode: "Cash" | "GCash" | "Bank" | "Other";
  date_in?: string | Date | null;
}

export const addServiceRequest = async (requestData: ServiceRequestInput): Promise<any> => {
  try {
    const branch_id = sessionStorage.getItem("branch_id");
    if (!branch_id) throw new Error("Branch ID not found in session storage");

    // Normalize date values to ISO or null
    const normalizeDate = (d?: string | Date | null) => {
      if (d == null || d === "") return null;
      const dt = d instanceof Date ? d : new Date(d);
      if (Number.isNaN(dt.getTime())) return null;
      return dt.toISOString();
    };

    // Map line items to backend format
    const payload = {
      ...requestData,
      branch_id,
      date_in: normalizeDate(requestData.date_in),
      cust_bdate: requestData.cust_bdate ?? null,
      lineItems: requestData.lineItems.map((item) => ({
        services: item.services.map((svc) => ({
          service_id: svc.service_id,
          quantity: Number(svc.quantity) || 1,
        })),
        priority: item.priority,
        shoes: item.shoes,
        current_location: item.current_location,
        storage_fee: typeof item.storage_fee === "number" ? item.storage_fee : 0,
        due_date: normalizeDate(item.due_date),
        before_img: item.before_img ?? null,
        after_img: item.after_img ?? null,
      })),
    };

    const res = await fetch(`${API_BASE_URL}/api/service-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Try to parse error body if not ok
    const contentType = res.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await res.json() : await res.text();

    if (!res.ok) {
      const errMsg = typeof body === "object" && body !== null ? (body.error ?? body.message ?? JSON.stringify(body)) : String(body);
      throw new Error(errMsg || `Failed to create service request (status ${res.status})`);
    }

    return body; // expected: { success, customer, lineItems, transaction }
  } catch (err) {
    console.error("Error creating service request:", err);
    throw err;
  }
};

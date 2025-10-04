const API_BASE_URL =
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:5000";

export async function applyPayment(transactionId: string, payload: {
  dueNow: number;
  customerPaid: number;
  modeOfPayment?: string;
  lineItemId?: string;
  markPickedUp?: boolean;
  payment_status?: string;
  provided_payment_id?: string;
  // Optional: full list of payments (id + amount + optional mode/date) in date order
  provided_payments_list?: Array<{ payment_id: string; payment_amount: number; payment_mode?: string; payment_date?: string }>;
}) {
  const token = sessionStorage.getItem("token");

  const res = await fetch(`${API_BASE_URL}/api/transactions/${encodeURIComponent(transactionId)}/apply-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `applyPayment failed: ${res.status}`);
  }

  return res.json();
}

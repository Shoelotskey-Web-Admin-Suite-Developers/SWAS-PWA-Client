const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getPaymentById = async (payment_id: string) => {
  if (!payment_id) throw new Error("payment_id is required");
  const res = await fetch(`${API_BASE_URL}/api/payments/${encodeURIComponent(payment_id)}`);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to fetch payment: ${txt}`);
  }
  const data = await res.json();
  return data.payment;
};

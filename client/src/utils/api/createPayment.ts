const API_BASE_URL =
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:5000";

export const createPayment = async (payload: { transaction_id: string; payment_amount: number; payment_mode?: string; branch_id?: string }) => {
  const token = sessionStorage.getItem("token");

  const res = await fetch(`${API_BASE_URL}/api/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to create payment: ${txt}`);
  }
  const data = await res.json();
  return data.payment;
};

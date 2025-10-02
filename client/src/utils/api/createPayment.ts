const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const createPayment = async (payload: { transaction_id: string; payment_amount: number; payment_mode?: string; branch_id?: string }) => {
  const res = await fetch(`${API_BASE_URL}/api/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to create payment: ${txt}`);
  }
  const data = await res.json();
  return data.payment;
};

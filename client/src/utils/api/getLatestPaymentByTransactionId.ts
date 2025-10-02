const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getLatestPaymentByTransactionId = async (transaction_id: string) => {
  if (!transaction_id) throw new Error("transaction_id is required");
  const res = await fetch(`${API_BASE_URL}/api/payments/latest/transaction/${encodeURIComponent(transaction_id)}`);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to fetch latest payment: ${txt}`);
  }
  const d = await res.json();
  return d.payment;
};

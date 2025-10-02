const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getPaymentStatus = async (transaction_id: string): Promise<string | null> => {
  try {
    if (!transaction_id) {
      console.warn("Transaction ID is required to fetch payment status.");
      return null;
    }

    const url = `${API_BASE_URL}/api/transactions/${transaction_id}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error("Failed to fetch transaction");

    const data = await res.json();
    console.log("API transaction response:", data);
    return data.transaction?.payment_status || null;
  } catch (err) {
    console.error("Error fetching payment status:", err);
    return null;
  }
};
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// src/utils/api/updateTransaction.ts
export const updateTransaction = async (transaction_id: string, updates: any) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/transactions/${transaction_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to update transaction");
    }

    const data = await res.json();
    return data; // { success: true, transaction: {...} }
  } catch (error: any) {
    console.error("Error updating transaction:", error);
    throw error;
  }
};
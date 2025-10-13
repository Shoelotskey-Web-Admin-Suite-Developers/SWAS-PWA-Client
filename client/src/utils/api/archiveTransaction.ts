// utils/api/archiveTransaction.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const archiveTransaction = async (transactionId: string) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No token found");

    const res = await fetch(`${BASE_URL}/api/transactions/${transactionId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_archive: true }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to archive transaction");
    }

    return await res.json();
  } catch (error) {
    console.error("Error archiving transaction:", error);
    throw error;
  }
};
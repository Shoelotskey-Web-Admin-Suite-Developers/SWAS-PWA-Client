// src/utils/api/deleteAllCustomers.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const deleteAllCustomers = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/customers`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to archive all customers: ${errorText}`);
    }

    return true; // 🔹 success confirmation
  } catch (err) {
    console.error("Error archiving all customers:", err);
    throw err;
  }
};

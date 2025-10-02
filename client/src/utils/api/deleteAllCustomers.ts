// src/utils/api/deleteAllCustomers.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const deleteAllCustomers = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/customers`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to delete all customers: ${errorText}`);
    }

    return true; // 🔹 success confirmation
  } catch (err) {
    console.error("Error deleting all customers:", err);
    throw err;
  }
};

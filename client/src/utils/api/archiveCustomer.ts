// utils/api/archiveCustomer.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const archiveCustomer = async (cust_id: string) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No token found");

    const res = await fetch(`${BASE_URL}/api/customers/${cust_id}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_archive: true }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to archive customer");
    }

    return await res.json();
  } catch (error) {
    console.error("Error archiving customer:", error);
    throw error;
  }
};
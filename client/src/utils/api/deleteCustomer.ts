// utils/api/deleteCustomer.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const deleteCustomer = async (cust_id: string) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No token found");

    const res = await fetch(`${BASE_URL}/api/customers/${cust_id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to delete customer: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error("Error deleting customer:", error);
    throw error;
  }
};

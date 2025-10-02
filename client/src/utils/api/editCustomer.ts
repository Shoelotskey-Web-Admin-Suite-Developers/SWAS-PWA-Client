// src/utils/api/editCustomer.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const editCustomer = async (
  cust_id: string,
  data: {
    cust_name?: string;
    cust_bdate?: string | null;
    cust_address?: string;
    cust_email?: string;
    cust_contact?: string;
    total_services?: number;
    total_expenditure?: number;
  }
) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No token found");

    const res = await fetch(`${BASE_URL}/api/customers/${cust_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to update customer");
    }

    const updatedCustomer = await res.json();
    return updatedCustomer;
  } catch (error) {
    console.error("Error editing customer:", error);
    throw error;
  }
};

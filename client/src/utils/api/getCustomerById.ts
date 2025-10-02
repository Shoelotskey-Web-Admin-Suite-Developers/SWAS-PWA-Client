const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface CustomerData {
  cust_id: string;
  cust_name: string;
  cust_bdate?: string; // ISO date string from backend
  cust_address?: string;
  cust_email?: string;
  cust_contact?: string;
  total_services: number;
  total_expenditure: number;
}

export async function getCustomerById(custId: string): Promise<CustomerData> {
  const token = sessionStorage.getItem("token");
  if (!token) throw new Error("No token found");

  const res = await fetch(`${BASE_URL}/api/customers/${custId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch customer");
  }

  return await res.json();
}
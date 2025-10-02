// utils/api/getTopCust.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface TopCustomer {
  cust_id: string;
  cust_name: string;
  cust_bdate?: Date;
  cust_address?: string;
  cust_email?: string;
  cust_contact?: string;
  total_services: number;
  total_expenditure: number;
}

export async function getTopCust(limit: number = 10): Promise<TopCustomer[]> {
  const token = sessionStorage.getItem("token");
  if (!token) throw new Error("No token found");

  const res = await fetch(`${BASE_URL}/api/customers`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch customers");
  }

  const customers: TopCustomer[] = await res.json();
  
  // Sort customers by total_expenditure in descending order and return top N
  return customers
    .filter(customer => customer.total_expenditure > 0) // Only include customers who have spent money
    .sort((a, b) => b.total_expenditure - a.total_expenditure)
    .slice(0, limit);
}
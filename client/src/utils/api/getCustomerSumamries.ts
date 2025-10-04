const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type CustomerSummaryDto = {
  cust_id: string;
  cust_name: string;
  cust_bdate?: string | null;
  cust_address?: string | null;
  cust_email?: string | null;
  cust_contact?: string | null;
  total_services?: number;
  total_expenditure?: number;
  balance?: number;
  currentServiceCount?: number;
  status?: "Active" | "Dormant";
};

export async function getCustomerSummaries(): Promise<CustomerSummaryDto[]> {
  const token = sessionStorage.getItem("token");
  if (!token) throw new Error("No token found");

  const res = await fetch(`${BASE_URL}/api/customers/summary`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch customer summaries");
  }

  const data = await res.json();
  return data as CustomerSummaryDto[];
}

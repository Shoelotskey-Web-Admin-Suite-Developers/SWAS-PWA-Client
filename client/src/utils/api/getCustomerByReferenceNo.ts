const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface CustomerByReferenceResponse {
  cust_id: string;
  cust_name: string;
  cust_bdate?: string;
  cust_address?: string;
  cust_email?: string;
  cust_contact?: string;
  total_services?: number;
  total_expenditure?: number;
}

export async function getCustomerByReferenceNo(referenceNo: string): Promise<CustomerByReferenceResponse | null> {
  try {
    const trimmed = referenceNo.trim();
    if (!trimmed) {
      throw new Error("Reference number is required");
    }

    const url = `${API_BASE_URL}/api/customers/search/by-reference?reference_no=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error("Failed to fetch customer by reference number");
    }

    return (await res.json()) as CustomerByReferenceResponse;
  } catch (error) {
    console.error("Error fetching customer by reference number:", error);
    throw error;
  }
}

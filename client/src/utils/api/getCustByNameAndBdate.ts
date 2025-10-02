// src/utils/api/getCustomerByNameAndBdate.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface ICustomer {
  cust_id: string;
  cust_name: string;
  cust_bdate: string;
  cust_address?: string;
  cust_email?: string;
  cust_contact?: string;
  total_services: number;
  total_expenditure: number;
}

export const getCustomerByNameAndBdate = async (
  cust_name: string,
  cust_bdate: string
): Promise<ICustomer | null> => {
  try {
    const url = `${API_BASE_URL}/api/customers/search/by-name-birthday?cust_name=${encodeURIComponent(
      cust_name
    )}&cust_bdate=${encodeURIComponent(cust_bdate)}`;

    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return null; // No customer found
      throw new Error("Failed to fetch customer");
    }

    const data: ICustomer = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching customer by name and birthday:", error);
    return null;
  }
};

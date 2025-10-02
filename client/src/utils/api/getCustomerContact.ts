const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getCustomerContact = async (cust_id: string): Promise<string | null> => {
  try {
    if (!cust_id) {
      console.warn("Customer ID is required to fetch customer contact.");
      return null;
    }

    const url = `${API_BASE_URL}/api/customers/${cust_id}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error("Failed to fetch customer");

    const customer = await res.json();
    return customer.cust_contact || null;
  } catch (err) {
    console.error("Error fetching customer contact:", err);
    return null;
  }
};
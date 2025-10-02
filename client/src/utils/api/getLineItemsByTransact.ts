const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getLineItemsByTransact(transaction_id: string) {
  const token = sessionStorage.getItem("token");
  if (!token) throw new Error("No token found");

  const res = await fetch(`${BASE_URL}/api/line-items/transaction/${transaction_id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch line items");
  }

  return await res.json();
}
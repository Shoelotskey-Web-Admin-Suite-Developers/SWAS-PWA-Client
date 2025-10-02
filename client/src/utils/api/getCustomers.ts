// utils/api/getCustomers.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getCustomers() {
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

  return res.json();
}

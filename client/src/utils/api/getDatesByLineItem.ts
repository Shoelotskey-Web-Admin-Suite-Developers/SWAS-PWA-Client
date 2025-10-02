const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getDatesByLineItem(line_item_id: string) {
  const token = sessionStorage.getItem("token");
  if (!token) throw new Error("No token found");

  const res = await fetch(`${BASE_URL}/api/dates/${line_item_id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    if (res.status === 404) {
      // Return null if no dates found instead of throwing
      return null;
    }
    throw new Error("Failed to fetch dates");
  }

  return await res.json();
}
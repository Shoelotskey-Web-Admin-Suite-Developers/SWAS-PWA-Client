// src/utils/api/deleteBranch.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL

export const deleteBranch = async (branchId: string) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No token found");

    const res = await fetch(`${BASE_URL}/api/branches/${branchId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to delete branch");
    }

    return true; // deletion successful
  } catch (err) {
    console.error("Failed to delete branch:", err);
    throw err;
  }
};
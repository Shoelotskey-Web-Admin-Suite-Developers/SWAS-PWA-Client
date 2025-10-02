// utils/api/deleteUser.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL

export const deleteUser = async (userId: string) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No token found");

    const res = await fetch(`${BASE_URL}/api/users/${userId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to delete user");
    }

    return true; // deletion successful
  } catch (err) {
    console.error("Failed to delete user:", err);
    throw err;
  }
};

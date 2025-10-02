// utils/api/editUser.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL

export const editUser = async (user_id: string, data: { branch_id?: string; password?: string }) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No token found");

    const res = await fetch(`${BASE_URL}/api/users/${user_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to update user");
    }

    const updatedUser = await res.json();
    return updatedUser;
  } catch (error) {
    console.error("Error editing user:", error);
    throw error;
  }
};

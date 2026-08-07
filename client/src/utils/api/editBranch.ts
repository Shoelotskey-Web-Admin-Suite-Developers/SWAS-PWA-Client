// src/utils/api/editBranch.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface EditBranchData {
  branch_name?: string
  location?: string
  branch_code?: string
  type?: string
  fb_link?: string | null
}

export const editBranch = async (
  branch_id: string,
  data: EditBranchData
) => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) throw new Error("No token found");

    const res = await fetch(`${BASE_URL}/api/branches/${branch_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to update branch");
    }

    const updatedBranch = await res.json();
    return updatedBranch;
  } catch (error) {
    console.error("Error editing branch:", error);
    throw error;
  }
};
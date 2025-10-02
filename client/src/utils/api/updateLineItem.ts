const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// src/utils/api/updateLineItem.ts
export const updateLineItem = async (line_item_id: string, updates: any) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/line-items/${line_item_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to update line item");
    }

    const data = await res.json();
    return data; // { success: true, lineItem: {...} }
  } catch (error: any) {
    console.error("Error updating line item:", error);
    throw error;
  }
};
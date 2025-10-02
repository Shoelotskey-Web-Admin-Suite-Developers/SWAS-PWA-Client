const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getLineItemsByBranch = async (branchId: string): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/line-items/branch/${branchId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Add authorization header if needed
        // "Authorization": `Bearer ${getToken()}`
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Return empty array if no items found instead of throwing error
        return [];
      }
      const error = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching line items by branch:", error);
    throw error;
  }
};
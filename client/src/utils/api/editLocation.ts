const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const updateLineItemLocation = async (
  lineItemId: string, 
  location: "Hub" | "Branch"
): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/line-items/${lineItemId}/location`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        // Add authorization header if needed
        // "Authorization": `Bearer ${getToken()}`
      },
      body: JSON.stringify({ current_location: location }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating line item location:", error);
    throw error;
  }
};


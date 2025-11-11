const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const updateCustomerCredibility = async (
  custId: string,
  action: "verify_arrival" | "flag_missed"
): Promise<{ success: boolean; credibility: number; canBook: boolean; message?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/customers/${custId}/credibility`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });

    // Check if response has content
    const text = await response.text();
    if (!text) {
      throw new Error(`Empty response from server (Status: ${response.status})`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse response:", text);
      throw new Error(`Invalid JSON response: ${text}`);
    }

    if (!response.ok) {
      throw new Error(data.message || "Failed to update customer credibility");
    }

    return data;
  } catch (error) {
    console.error("Error updating customer credibility:", error);
    throw error;
  }
};

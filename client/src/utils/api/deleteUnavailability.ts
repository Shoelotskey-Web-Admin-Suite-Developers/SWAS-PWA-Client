// src/utils/api/deleteUnavailability.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const deleteUnavailability = async (unavailability_id: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/unavailability/${unavailability_id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to delete unavailability: ${errorText}`);
    }

    return true; // 🔹 success confirmation
  } catch (err) {
    console.error("Error deleting unavailability:", err);
    throw err;
  }
};

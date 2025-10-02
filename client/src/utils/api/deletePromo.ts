const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const deletePromo = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/promos/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to delete promo: ${errorText}`);
    }

    return true; // ✅ success
  } catch (err) {
    console.error("Error deleting promo:", err);
    throw err;
  }
};

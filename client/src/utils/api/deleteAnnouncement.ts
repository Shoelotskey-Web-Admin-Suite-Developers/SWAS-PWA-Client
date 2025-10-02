const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const deleteAnnouncement = async (id: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/announcements/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to delete announcement: ${errorText}`);
    }

    return true; // 🔹 success confirmation
  } catch (err) {
    console.error("Error deleting announcement:", err);
    throw err;
  }
};

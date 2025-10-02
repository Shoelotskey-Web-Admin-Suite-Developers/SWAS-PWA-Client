const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const addAnnouncement = async (title: string, description: string) => {
  try {
    // Get branch_id from session storage
    const branch_id = sessionStorage.getItem("branch_id");
    if (!branch_id) throw new Error("Branch ID not found in session storage");

    // Send POST request with branch_id
    const res = await fetch(`${API_BASE_URL}/api/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        announcement_title: title,
        announcement_description: description || null,
        branch_id, // ✅ include branch_id
      }),
    });

    if (!res.ok) throw new Error("Failed to post announcement");

    const data = await res.json();
    return data.announcement;
  } catch (err) {
    console.error("Error posting announcement:", err);
    throw err;
  }
};

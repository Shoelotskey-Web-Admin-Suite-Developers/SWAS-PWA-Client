const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const editAnnouncement = async (
  announcement_id: string,
  title: string,
  description: string
) => {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/announcements/${encodeURIComponent(announcement_id)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          announcement_title: title,
          announcement_description: description,
        }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to update announcement: ${errorText}`);
    }

    // Backend returns { announcement: {...} }
    const data = await res.json();
    return data.announcement; // 🔹 return just the updated announcement object
  } catch (err) {
    console.error("Error editing announcement:", err);
    throw err;
  }
};

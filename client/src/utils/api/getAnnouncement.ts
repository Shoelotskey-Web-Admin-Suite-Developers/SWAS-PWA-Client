const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getAnnouncements = async () => {
  try {
    const branch_id = sessionStorage.getItem("branch_id");

    if (!branch_id) {
      console.warn("Branch ID not found in session storage. Cannot fetch announcements.");
      return [];
    }

    // If SUPERADMIN, don’t filter by branch_id
    const url =
      branch_id === "SWAS-SUPERADMIN"
        ? `${API_BASE_URL}/api/announcements?all=true`
        : `${API_BASE_URL}/api/announcements?branch_id=${branch_id}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch announcements");

    const data = await res.json();
    return data.announcements;
  } catch (err) {
    console.error("Error fetching announcements:", err);
    return [];
  }
};

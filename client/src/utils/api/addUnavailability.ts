// src/utils/api/addUnavailability.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const addUnavailability = async (
  date_unavailable: string, // e.g., "2025-09-17"
  type: "Full Day" | "Partial Day",
  time_start?: string,      // e.g., "09:00"
  time_end?: string,        // e.g., "12:00"
  note?: string             // optional note
) => {
  try {
    // Get branch_id from session storage
    const branch_id = sessionStorage.getItem("branch_id");
    if (!branch_id) throw new Error("Branch ID not found in session storage");

    // Send POST request with branch_id
    const res = await fetch(`${API_BASE_URL}/api/unavailability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branch_id,
        date_unavailable,
        type,
        time_start: time_start || null,
        time_end: time_end || null,
        note: note || null,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to create unavailability");
    }

    const data = await res.json();
    return data.unavailability;
  } catch (err) {
    console.error("Error creating unavailability:", err);
    throw err;
  }
};

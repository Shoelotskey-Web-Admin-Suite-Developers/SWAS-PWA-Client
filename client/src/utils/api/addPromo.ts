const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const addPromo = async (
  title: string,
  description: string,
  dates: string[] // array of date strings, e.g., ["2025-09-09", "2025-09-10"]
) => {
  try {
    // Get branch_id from session storage
    const branch_id = sessionStorage.getItem("branch_id");
    if (!branch_id) throw new Error("Branch ID not found in session storage");

    // Send POST request with branch_id and dates
    const res = await fetch(`${API_BASE_URL}/api/promos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promo_title: title,
        promo_description: description || null,
        promo_dates: dates, // ✅ send array of dates
        branch_id, // ✅ include branch_id
      }),
    });

    if (!res.ok) throw new Error("Failed to post promo");

    const data = await res.json();
    return data.promo;
  } catch (err) {
    console.error("Error posting promo:", err);
    throw err;
  }
};

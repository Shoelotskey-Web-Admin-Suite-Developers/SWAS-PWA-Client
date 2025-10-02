const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const editPromo = async (
  promo_id: string,
  title: string,
  description: string,
  dates: Date[] // send dates array instead of duration string
) => {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/promos/${encodeURIComponent(promo_id)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promo_title: title,
          promo_description: description,
          promo_dates: dates, // backend will generate promo_duration
        }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to update promo: ${errorText}`);
    }

    const data = await res.json();
    return data.promo;
  } catch (err) {
    console.error("Error editing promo:", err);
    throw err;
  }
};

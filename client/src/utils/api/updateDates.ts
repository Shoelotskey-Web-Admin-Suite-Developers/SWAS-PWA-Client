const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const updateDates = async (
  line_item_id: string,
  updates: {
    srm_date?: string;
    rd_date?: string;
    ibd_date?: string;
    wh_date?: string;
    rb_date?: string;
    is_date?: string;
    rpu_date?: string;
    current_status?: number;
  }
) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/dates`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        line_item_id,
        ...updates,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to update dates: ${errorText}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error updating dates:", err);
    throw err;
  }
};
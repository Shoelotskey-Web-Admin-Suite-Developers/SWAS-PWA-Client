const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const updateAppointmentStatus = async (appointment_id: string, status: "Approved" | "Cancelled" | "Pending") => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/appointments/${appointment_id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to update appointment status");
    }

    const data = await res.json();
    return data.data;
  } catch (err) {
    console.error("updateAppointmentStatus error:", err);
    throw err;
  }
};

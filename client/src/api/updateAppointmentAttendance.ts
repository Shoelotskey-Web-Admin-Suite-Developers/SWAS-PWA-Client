const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const updateAppointmentAttendance = async (
  appointment_ids: string[],
  attendance_status: "Verified" | "Missed"
): Promise<{ success: boolean; message?: string; modifiedCount?: number }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/appointments/attendance`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ appointment_ids, attendance_status }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update appointment attendance");
    }

    return data;
  } catch (error) {
    console.error("Error updating appointment attendance:", error);
    throw error;
  }
};

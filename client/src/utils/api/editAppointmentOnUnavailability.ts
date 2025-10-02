const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface UnavailabilityPayload {
  date_unavailable: string;
  type: "Full Day" | "Partial Day";
  time_start?: string; // required only for partial day
  time_end?: string;   // required only for partial day
}

/**
 * Cancel appointments affected by unavailability.
 * @param unavailability Unavailability data
 */
export const cancelAppointmentOnUnavailability = async (
  unavailability: UnavailabilityPayload
) => {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/appointments/cancel-affected`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(unavailability),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to cancel affected appointments: ${errorText}`);
    }

    const data = await res.json();
    return data; // { success: true, message: "Affected appointments cancelled" }
  } catch (err) {
    console.error("Error cancelling appointments:", err);
    throw err;
  }
};

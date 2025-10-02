// src/utils/api/getAppointmentsPending.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getAppointmentsPending = async () => {
  try {
    const branch_id = sessionStorage.getItem("branch_id");

    if (!branch_id) {
      console.warn("Branch ID not found in session storage. Cannot fetch pending appointments.");
      return [];
    }

    const url =
      branch_id === "SWAS-SUPERADMIN"
        ? `${API_BASE_URL}/api/appointments/pending?all=true`
        : `${API_BASE_URL}/api/appointments/pending?branch_id=${branch_id}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch pending appointments");

    const data = await res.json();
    return data.data;
  } catch (err) {
    console.error("Error fetching pending appointments:", err);
    return [];
  }
};

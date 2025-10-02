// src/utils/api/getAppointmentsApproved.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getAppointmentsApproved = async () => {
  try {
    const branch_id = sessionStorage.getItem("branch_id");

    if (!branch_id) {
      console.warn("Branch ID not found in session storage. Cannot fetch approved appointments.");
      return [];
    }

    const url =
      branch_id === "SWAS-SUPERADMIN"
        ? `${API_BASE_URL}/api/appointments/approved?all=true`
        : `${API_BASE_URL}/api/appointments/approved?branch_id=${branch_id}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch approved appointments");

    const data = await res.json();
    return data.data; 
  } catch (err) {
    console.error("Error fetching approved appointments:", err);
    return [];
  }
};

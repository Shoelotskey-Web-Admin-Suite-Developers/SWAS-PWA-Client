// src/utils/api/getUnavailabilityWhole.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getUnavailabilityWhole = async () => {
  try {
    const branch_id = sessionStorage.getItem("branch_id");

    if (!branch_id) {
      console.warn("Branch ID not found in session storage. Cannot fetch unavailabilities.");
      return [];
    }

    // Build URL
    const baseUrl =
      branch_id === "SWAS-SUPERADMIN"
        ? `${API_BASE_URL}/api/unavailability?all=true`
        : `${API_BASE_URL}/api/unavailability?branch_id=${branch_id}`;

    const res = await fetch(baseUrl);
    if (!res.ok) throw new Error("Failed to fetch unavailabilities");

    const data = await res.json();

    // Filter only Full Day records
    const fullDayRecords = data.unavailabilities.filter(
      (record: any) => record.type === "Full Day"
    );

    return fullDayRecords;
  } catch (err) {
    console.error("Error fetching full-day unavailabilities:", err);
    return [];
  }
};

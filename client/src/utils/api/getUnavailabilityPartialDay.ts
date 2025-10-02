// src/utils/api/getUnavailabilityPartial.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getUnavailabilityPartial = async () => {
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

    // Filter only Partial Day records
    const partialDayRecords = data.unavailabilities.filter(
      (record: any) => record.type === "Partial Day"
    );

    return partialDayRecords;
  } catch (err) {
    console.error("Error fetching partial-day unavailabilities:", err);
    return [];
  }
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface Promo {
  _id: string;
  promo_id: string;
  promo_title: string;
  promo_description?: string | null;
  promo_dates: string[]; // ISO strings from backend
  promo_duration: string; // formatted duration string
  branch_id: string;
}

export const getPromos = async (): Promise<Promo[]> => {
  try {
    const branch_id = sessionStorage.getItem("branch_id");

    if (!branch_id) {
      console.warn("Branch ID not found in session storage. Cannot fetch promos.");
      return [];
    }

    const url =
      branch_id === "SWAS-SUPERADMIN"
        ? `${API_BASE_URL}/api/promos?all=true`
        : `${API_BASE_URL}/api/promos?branch_id=${branch_id}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch promos");

    const data = await res.json();
    return data.promos as Promo[];
  } catch (err) {
    console.error("Error fetching promos:", err);
    return [];
  }
};

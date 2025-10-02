// src/utils/api/getServices.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface IService {
  service_id: string;
  service_name: string;
  service_base_price: number;
  service_duration: number;
  service_type: "Service" | "Additional";
  service_description?: string;
}

export const getServices = async (): Promise<IService[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/services`);
    if (!res.ok) throw new Error("Failed to fetch services");

    const data = await res.json();
    return data.services; // 🔑 return the array, not the object
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
  }
};


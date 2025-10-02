const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface IService {
  service_id: string;
  service_name: string;
  service_base_price: number;
  service_duration: number;
  service_type: "Service" | "Additional";
  service_description?: string;
}

export const getServiceById = async (serviceId: string): Promise<IService | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/services/${encodeURIComponent(serviceId)}`);
    if (!res.ok) throw new Error('Failed to fetch service');
    const data = await res.json();
    return data.service || null;
  } catch (err) {
    console.error('Error fetching service by id:', err);
    return null;
  }
};

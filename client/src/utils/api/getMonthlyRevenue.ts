// utils/api/getMonthlyRevenue.ts

export interface MonthlyRevenueData {
  month: string;
  total: number;
  SMVal: number;
  Val: number;
  SMGra: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getMonthlyRevenue = async (): Promise<MonthlyRevenueData[]> => {
  try {
    const base = API_BASE_URL && API_BASE_URL.length > 0
      ? API_BASE_URL.replace(/\/$/, "")
      : "http://localhost:5000";
    
    if (!API_BASE_URL) {
      console.warn("VITE_API_BASE_URL not set — defaulting to http://localhost:5000 for monthly revenue fetch");
    }
    
    const url = `${base}/api/analytics/monthly-revenue`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch monthly revenue (${response.status}): ${body.slice(0, 300)}`);
    }
    
    const data: MonthlyRevenueData[] = await response.json();
    return data;
  } catch (err) {
    console.error("Error fetching monthly revenue:", err);
    throw err;
  }
};
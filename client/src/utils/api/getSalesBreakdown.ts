// utils/api/getSalesBreakdown.ts

export interface ISalesBreakdown {
  status: string;
  transactions: number;
  amount: number;
  fill: string;
}

export interface ISalesBreakdownResponse {
  data: ISalesBreakdown[];
  dateRange: {
    earliest: string | null;
    latest: string | null;
    totalTransactions: number;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getSalesBreakdown = async (selectedBranches?: string[]): Promise<ISalesBreakdownResponse> => {
  try {
    const base = API_BASE_URL && API_BASE_URL.length > 0
      ? API_BASE_URL.replace(/\/$/, "")
      : "http://localhost:5000";
    
    if (!API_BASE_URL) {
      console.warn("VITE_API_BASE_URL not set — defaulting to http://localhost:5000 for analytics fetches");
    }
    
    // Build URL with branch filter
    let actualUrl = `${base}/api/analytics/sales-breakdown`;
    if (selectedBranches && selectedBranches.length > 0) {
      const branchParam = selectedBranches.join(',');
      actualUrl += `?branches=${encodeURIComponent(branchParam)}`;
    }
    
    const response = await fetch(actualUrl);
    
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch sales breakdown (${response.status}): ${body.slice(0, 300)}`);
    }
    
    const data: ISalesBreakdownResponse = await response.json();
    return data;
  } catch (err) {
    console.error("Error fetching sales breakdown:", err);
    throw err;
  }
};
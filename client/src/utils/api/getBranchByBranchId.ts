const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface IBranch {
  branch_id: string;
  branch_name: string;
  branch_code: string;
  branch_number: number;
  location: string;
  type: string;
}

export const getBranchByBranchId = async (branchId: string): Promise<IBranch | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/branches/${encodeURIComponent(branchId)}`);
    if (!res.ok) throw new Error('Failed to fetch branch');
    const data = await res.json();
    return data.branch || null;
  } catch (err) {
    console.error('Error fetching branch by id:', err);
    return null;
  }
};

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getBranchType(branchId?: string): Promise<string | null> {
  const branchIdType = branchId || sessionStorage.getItem("branch_id");
  try {
    const url = `${BASE_URL}/api/branches/${branchIdType}`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.branch?.type || null;
  } catch {
    return null;
  }
}
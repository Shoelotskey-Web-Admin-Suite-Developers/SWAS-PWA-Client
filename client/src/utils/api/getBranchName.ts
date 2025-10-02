const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getBranchNameForNavbar(): Promise<string | null> {
  const branchIdName = sessionStorage.getItem("branch_id");
  try {
    const url = `${BASE_URL}/api/branches/${branchIdName}`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.branch?.branch_name || null;
  } catch {
    return null;
  }
}
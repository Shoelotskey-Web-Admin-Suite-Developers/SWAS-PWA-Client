const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getLineItems(status: string) {
  const token = sessionStorage.getItem("token");
  const currentBranchId = sessionStorage.getItem("branch_id"); // 👈 get current branch

  if (!token || !currentBranchId) throw new Error("No token or branch_id found");

  const res = await fetch(`${BASE_URL}/api/line-items/status/${status}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch line items: ${res.statusText}`);
  }

  const data = await res.json();

  // First filter out archived items
  const nonArchivedItems = data.filter((item: { is_archive?: boolean }) => !item.is_archive);

  if (currentBranchId === "SWAS-SUPERADMIN" || "HUBV-W-NCR") {
    // Super admin → return all non-archived line items
    return nonArchivedItems;
  } else {
    // Regular branch → return only their branch's non-archived line items
    return nonArchivedItems.filter((item: { branch_id: string }) => item.branch_id === currentBranchId);
  }
}

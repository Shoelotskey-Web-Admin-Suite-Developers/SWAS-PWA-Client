// utils/api/getTransactions.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getTransactions() {
  const token = sessionStorage.getItem("token");
  const currentBranchId = sessionStorage.getItem("branch_id");

  if (!token || !currentBranchId) throw new Error("No token or branch_id found");

  const res = await fetch(`${BASE_URL}/api/transactions`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch transactions");
  }

  const data = await res.json();

  if (
    currentBranchId === "SWAS-SUPERADMIN" ||
    currentBranchId === "HUBV-W-NCR"
  ) {
    // Super admin or HUBV-W-NCR → return all transactions
    return data;
  } else {
    // Regular branch → return only their transactions
    return data.filter((tx: { branch_id: string }) => tx.branch_id === currentBranchId);
  }
}
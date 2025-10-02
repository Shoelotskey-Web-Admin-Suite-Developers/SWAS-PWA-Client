// utils/api/getBranches.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function getBranches() {
  const token = sessionStorage.getItem("token")
  const currentBranchId = sessionStorage.getItem("branch_id") // 👈 get current branch

  if (!token || !currentBranchId) throw new Error("No token or branch_id found")

  const res = await fetch(`${BASE_URL}/api/branches`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    throw new Error("Failed to fetch branches")
  }

  const data = await res.json()

  if (currentBranchId === "SWAS-SUPERADMIN") {
    // Super admin → return all branches
    return data
  } else {
    // Regular branch → return only their branch
    return data.filter((b: { branch_id: string }) => b.branch_id === currentBranchId)
  }
}

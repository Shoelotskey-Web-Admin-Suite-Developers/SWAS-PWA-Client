const BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface BranchRecord {
  _id?: string
  branch_id: string
  branch_number: number
  branch_name: string
  branch_code: string
  location: string
  type: string
  fb_link?: string | null
}

export async function addBranch(branchName: string, location: string): Promise<BranchRecord> {
  const token = sessionStorage.getItem("token")
  if (!token) throw new Error("No token found")

  const res = await fetch(`${BASE_URL}/api/branches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ branch_name: branchName, location }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to add branch")
  }

  const data = await res.json()
  return data.branch
}
const BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function addUser({
  userId,
  branchId,
  password,
}: {
  userId: string
  branchId: string
  password: string
}) {
  const token = sessionStorage.getItem("token")
  if (!token) throw new Error("No token found")

  const res = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ user_id: userId, branch_id: branchId, password }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to add user")
  }

  return res.json()
}

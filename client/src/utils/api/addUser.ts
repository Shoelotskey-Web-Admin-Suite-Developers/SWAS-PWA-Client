const BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function addUser({
  userId,
  branchId,
  password,
  position,
  userName,
}: {
  userId: string
  branchId: string
  password: string
  position: string
  userName?: string | null
}) {
  const token = sessionStorage.getItem("token")
  if (!token) throw new Error("No token found")

  const payload = {
    user_id: userId,
    branch_id: branchId,
    password,
    position,
    ...(userName && userName.trim().length > 0 ? { user_name: userName.trim() } : {}),
  }

  const res = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to add user")
  }

  return res.json()
}

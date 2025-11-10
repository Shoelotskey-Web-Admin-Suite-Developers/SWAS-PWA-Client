const BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface UserNameResponse {
  user_id: string
  user_name: string | null
}

export async function getUserName(userId: string): Promise<UserNameResponse> {
  const token = sessionStorage.getItem("token")
  if (!token) {
    throw new Error("No token found")
  }

  const res = await fetch(`${BASE_URL}/api/users/${encodeURIComponent(userId)}/name`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.message || "Failed to fetch user name")
  }

  return res.json()
}

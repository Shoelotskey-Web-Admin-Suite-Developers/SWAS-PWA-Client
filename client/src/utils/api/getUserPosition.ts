const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface UserPositionResponse {
  user_id: string;
  position: string | null;
}

export async function getUserPosition(userId: string): Promise<UserPositionResponse> {
  const token = sessionStorage.getItem("token");

  const res = await fetch(`${BASE_URL}/api/users/${encodeURIComponent(userId)}/position`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch user position");
  }

  // Normalize: ensure both fields exist
  return {
    user_id: data.user_id ?? userId,
    position: data.position ?? null,
  };
}

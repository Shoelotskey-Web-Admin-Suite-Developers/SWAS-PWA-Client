const BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function loginUser(userId: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  return data;
}

export function logoutUser() {
  // Use sessionStorage to align with login logic
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user_id");
  sessionStorage.removeItem("branch_id");
  sessionStorage.removeItem("position");
  sessionStorage.removeItem("branch_type");
}

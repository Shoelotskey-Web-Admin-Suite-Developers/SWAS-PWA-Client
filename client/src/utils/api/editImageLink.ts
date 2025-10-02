const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function saveLineItemImage(
  lineItemId: string,
  type: "before" | "after",
  url: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/line-items/${lineItemId}/image`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, url }),
      }
    );
    return res.ok;
  } catch (err) {
    console.error("Error saving image URL to DB:", err);
    return false;
  }
}
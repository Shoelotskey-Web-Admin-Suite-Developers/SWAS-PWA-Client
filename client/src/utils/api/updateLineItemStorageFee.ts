const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const updateLineItemStorageFee = async (line_item_id: string, storage_fee: number) => {
  const token = sessionStorage.getItem('token');
  if (!token) throw new Error('No token in session storage');

  const res = await fetch(`${API_BASE_URL}/api/line-items/${encodeURIComponent(line_item_id)}/storage-fee`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ storage_fee }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Failed to update storage fee: ${res.status}`);
  }

  return res.json();
}

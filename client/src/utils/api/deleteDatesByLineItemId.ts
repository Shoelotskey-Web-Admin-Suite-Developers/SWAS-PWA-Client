const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function deleteDatesByLineItemId(lineItemId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/dates/${lineItemId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete dates');
  }

  return;
}
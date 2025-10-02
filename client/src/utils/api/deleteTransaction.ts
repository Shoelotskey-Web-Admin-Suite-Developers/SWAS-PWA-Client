const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function deleteTransaction(transactionId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete transaction');
  }

  return;
}
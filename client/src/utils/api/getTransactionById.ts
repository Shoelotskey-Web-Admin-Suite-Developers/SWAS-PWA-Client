const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
import { getBranchType } from "./getBranchType";

export const getTransactionById = async (transaction_id: string) => {
  const branch_id = sessionStorage.getItem("branch_id");
  if (!branch_id) throw new Error("Branch ID not found in session storage");

  // Fetch transaction from server without sending branch_id (server will return full data)
  const res = await fetch(`${API_BASE_URL}/api/transactions/${transaction_id}`);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch transaction: ${errorText}`);
  }

  const data = await res.json();

  // If superadmin or branch type is 'W', return everything
  if (branch_id === "SWAS-SUPERADMIN") return data;

  const type = await getBranchType(branch_id);
  if (type === "W") return data;

  // Otherwise, filter returned transaction and lineItems to only include this branch
  const filteredLineItems = (data.lineItems || []).filter((li: any) => li.branch_id === branch_id);

  // If transaction has a branch_id field and it doesn't match, set transaction to null
  const transaction = data.transaction || null;
  const transactionBranchMatches = !transaction || !transaction.branch_id || transaction.branch_id === branch_id;

  return { transaction: transactionBranchMatches ? transaction : null, customer: data.customer || null, lineItems: filteredLineItems };
};

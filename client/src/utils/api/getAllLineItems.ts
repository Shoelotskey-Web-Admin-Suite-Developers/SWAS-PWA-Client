const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;



export async function getAllLineItems() {
  const token = sessionStorage.getItem("token");
  const currentBranchId = sessionStorage.getItem("branch_id");
  const branchType = sessionStorage.getItem("branch_type");

  if (!token || !currentBranchId) throw new Error("No token or branch_id found");

  try {
    // Fetch line items, transactions, and customers in parallel for efficiency
    const [lineItemsRes, transactionsRes, customersRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/line-items`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }),
      fetch(`${API_BASE_URL}/api/transactions`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }),
      fetch(`${API_BASE_URL}/api/customers`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
    ]);

    console.debug("getAllLineItems: branch info", { currentBranchId, branchType });

    // Handle line items response
    let lineItems = [];
    if (lineItemsRes.ok) {
      lineItems = await lineItemsRes.json();
      console.debug("getAllLineItems: fetched line items count", lineItems.length);
      if (lineItems.length > 0) {
        console.debug("getAllLineItems: sample line item", lineItems[0]);
      }
    } else {
      console.error("getAllLineItems: line items request failed", {
        status: lineItemsRes.status, 
        statusText: lineItemsRes.statusText,
        url: lineItemsRes.url
      });
      
      // Server must be running to fetch real data
      throw new Error(`Line items API failed: ${lineItemsRes.statusText}. Please ensure the server is running.`);
    }

    let transactions = [];
    if (!transactionsRes.ok) {
      console.error("getAllLineItems: transactions request failed", {
        status: transactionsRes.status, 
        statusText: transactionsRes.statusText,
        url: transactionsRes.url
      });
      
      if (transactionsRes.status === 404) {
        return []; // Return empty array if no transactions found
      }
      throw new Error(`Failed to fetch transactions: ${transactionsRes.statusText}`);
    } else {
      transactions = await transactionsRes.json();
      console.debug("getAllLineItems: fetched transactions count", transactions.length);
    }
    
    // Handle customers response (might not exist or be empty)
    let customers = [];
    if (customersRes.ok) {
      customers = await customersRes.json();
      console.debug("getAllLineItems: fetched customers count", customers.length);
    }
    
    // Create lookup maps for fast access
    const customerMap = new Map();
    customers.forEach((customer: any) => {
      customerMap.set(customer.cust_id, customer);
    });

    const lineItemMap = new Map();
    lineItems.forEach((lineItem: any) => {
      lineItemMap.set(lineItem.line_item_id, lineItem);
    });
    
    console.debug("getAllLineItems: line item map size", lineItemMap.size);
    
    // Filter transactions based on branch permissions
    let filteredTransactions;
    if (currentBranchId === "SWAS-SUPERADMIN" || branchType === "A") {
      filteredTransactions = transactions;
    } else {
      filteredTransactions = transactions.filter((tx: any) => tx.branch_id === currentBranchId);
    }

    console.debug("getAllLineItems: filtered transactions count", filteredTransactions.length);

    // Filter to only transactions that are payment-eligible (not fully paid and released)
    const paymentEligibleTransactions = filteredTransactions.filter((tx: any) => {
      // Only include transactions that have a remaining balance or are not fully released
      const hasBalance = (tx.payment_status !== "PAID") || 
                        (tx.no_pairs > tx.no_released) || 
                        (tx.no_released === 0);
      return hasBalance;
    });

    console.debug("getAllLineItems: payment eligible transactions count", paymentEligibleTransactions.length);

    // Convert transactions to line items format, using real line item data when available
    const enrichedLineItems: any[] = [];
    
    // Define allowed statuses for payment eligibility
    const paymentEligibleStatuses = [
      "Queued",
      "Ready for Delivery",
      "Incoming Branch Delivery", 
      "In Process",
      "Returning to Branch",
      "To Pack",
      "Ready for Pickup"
    ];
    
    for (const transaction of paymentEligibleTransactions) {
      if (transaction.line_item_id && Array.isArray(transaction.line_item_id)) {
        // Get customer data from lookup map
        const customer = customerMap.get(transaction.cust_id);
        
        // If we don't have line items from the bulk API, try to fetch them individually for this transaction
        if (lineItemMap.size === 0) {
          try {
            const txLineItemsRes = await fetch(`${API_BASE_URL}/api/line-items/transaction/${transaction.transaction_id}`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });
            
            if (txLineItemsRes.ok) {
              const txLineItems = await txLineItemsRes.json();
              console.debug("getAllLineItems: fetched individual line items for tx", transaction.transaction_id, txLineItems.length);
              // Add these line items to our map
              txLineItems.forEach((lineItem: any) => {
                lineItemMap.set(lineItem.line_item_id, lineItem);
              });
            }
          } catch (error) {
            console.debug("Failed to fetch line items for transaction", transaction.transaction_id, error);
          }
        }
        
        transaction.line_item_id.forEach((lineItemId: string, index: number) => {
          // Try to get real line item data from the API response
          const realLineItem = lineItemMap.get(lineItemId);
          
          // Debug logging for line item lookup
          if (index === 0) { // Only log for first item to avoid spam
            console.debug("getAllLineItems: looking up line item", {
              lineItemId,
              found: !!realLineItem,
              realShoes: realLineItem?.shoes,
              realStatus: realLineItem?.current_status,
              mapSize: lineItemMap.size
            });
          }
          
          // Skip items without real line item data (causes "Shoe X" fallback)
          if (!realLineItem) {
            console.debug("getAllLineItems: skipping item without real line item data", lineItemId);
            return;
          }
          
          // Only include items with payment-eligible statuses
          if (!paymentEligibleStatuses.includes(realLineItem.current_status)) {
            console.debug("getAllLineItems: skipping item with non-eligible status", {
              lineItemId,
              status: realLineItem.current_status
            });
            return;
          }
          
          const enrichedItem = {
            // Line item data - use real data since we verified realLineItem exists
            line_item_id: lineItemId,
            transaction_id: transaction.transaction_id,
            branch_id: transaction.branch_id,
            cust_id: transaction.cust_id,
            current_status: realLineItem.current_status,
            priority: realLineItem.priority,
            services: realLineItem.services,
            shoes: realLineItem.shoes, // Now guaranteed to be real shoe name
            date_in: transaction.date_in,
            storage_fee: realLineItem.storage_fee || 0,
            due_date: realLineItem.due_date,
            latest_update: realLineItem.latest_update,
            current_location: realLineItem.current_location,
            
            // Pre-populate transaction data to avoid additional API calls
            _transaction: transaction,
            _customer: {
              cust_id: transaction.cust_id,
              cust_name: customer?.cust_name || "Unknown Customer",
              cust_address: customer?.cust_address || ""
            }
          };

          enrichedLineItems.push(enrichedItem);
        });
      }
    }

    console.debug("getAllLineItems: final enriched line items count", enrichedLineItems.length);
    return enrichedLineItems;
    
  } catch (error) {
    console.error("Error fetching line items via transactions:", error);
    // Return empty array instead of throwing error to prevent UI crashes
    return [];
  }
}

import { getLineItemsByTransact } from "@/utils/api/getLineItemsByTransact";
import { toast } from "sonner";

// Define service mappings (copy from EditReceiptDialog.tsx)
const SERVICE_ID_TO_NAME: Record<string, string> = {
  "SERVICE-1": "Basic Cleaning",
  "SERVICE-2": "Minor Reglue",
  "SERVICE-3": "Full Reglue",
  "SERVICE-4": "Unyellowing",
  "SERVICE-5": "Minor Retouch",
  "SERVICE-6": "Minor Restoration",
  "SERVICE-7": "Additional Layer",
  "SERVICE-8": "Color Renewal (2 colors)",
  "SERVICE-9": "Color Renewal (3 colors)",
};

// Updated service options to match backend
const SERVICE_OPTIONS = ["Basic Cleaning", "Minor Reglue", "Full Reglue"];
const ADDITIONAL_OPTIONS = [
  "Unyellowing",
  "Minor Retouch",
  "Minor Restoration", 
  "Additional Layer",
  "Color Renewal (2 colors)",
  "Color Renewal (3 colors)",
];

export async function exportRecordsToCSV(rows: Row[]) {
  toast.info("Preparing export...");

  try {
    // First, fetch all line items for each transaction
    const rowsWithLineItems = await Promise.all(
      rows.map(async (row) => {
        // Skip fetching if the row already has transactions
        if (row.transactions && row.transactions.length > 0) {
          return row;
        }

        try {
          // Fetch line items for this transaction
          const lineItems = await getLineItemsByTransact(row.id);
          
          // Map line items to Transaction format (similar to EditReceiptDialog)
          const transactions = lineItems.map((item: any) => {
            // Separate services by type
            const serviceNeeded: string[] = [];
            const additional: string[] = [];
            
            item.services.forEach((s: any) => {
              const serviceName = SERVICE_ID_TO_NAME[s.service_id];
              if (serviceName) {
                if (SERVICE_OPTIONS.includes(serviceName)) {
                  serviceNeeded.push(serviceName);
                } else if (ADDITIONAL_OPTIONS.includes(serviceName)) {
                  additional.push(serviceName);
                }
              }
            });
            
            return {
              id: item.line_item_id,
              shoeModel: item.shoes || "Unknown model",
              serviceNeeded,
              additional,
              rush: item.priority === "Rush",
              status: item.current_status || "queued",
              statusDates: {}, // We don't need detailed dates for the export
              beforeImage: item.before_img || null,
              afterImage: item.after_img || null
            };
          });
          
          // Return updated row with transactions
          return {
            ...row,
            transactions
          };
        } catch (error) {
          console.error(`Failed to fetch line items for transaction ${row.id}:`, error);
          // Return the row without transactions if fetch fails
          return row;
        }
      })
    );

    // Now create flattened records from the complete data
    const flattenedRecords = rowsWithLineItems.flatMap(row => {
      // If no transactions, return one row with transaction data only
      if (!row.transactions || row.transactions.length === 0) {
        return [{
          receiptId: row.id,
          customer: row.customer,
          dateIn: formatDate(row.dateIn),
          dateOut: formatDate(row.dateOut),
          branch: row.branch,
          branchLocation: row.branchLocation,
          receivedBy: row.receivedBy,
          total: row.total,
          amountPaid: row.amountPaid,
          remainingBalance: row.remaining,
          status: row.status,
          // Line item fields empty
          lineItemId: '',
          shoeModel: '',
          services: '',
          additional: '',
          rush: '',
          currentStatus: ''
        }];
      }
      
      // Otherwise, create one row for each line item
      return row.transactions.map(tx => ({
        receiptId: row.id,
        customer: row.customer,
        dateIn: formatDate(row.dateIn),
        dateOut: formatDate(row.dateOut),
        branch: row.branch,
        branchLocation: row.branchLocation,
        receivedBy: row.receivedBy,
        total: row.total,
        amountPaid: row.amountPaid,
        remainingBalance: row.remaining,
        status: row.status,
        // Line item details
        lineItemId: tx.id,
        shoeModel: tx.shoeModel,
        services: tx.serviceNeeded?.join(', ') || '',
        additional: tx.additional?.join(', ') || '',
        rush: tx.rush ? 'Yes' : 'No',
        currentStatus: tx.status
      }));
    });
    
    // Convert to CSV
    const headers = [
      'Receipt ID', 'Customer', 'Date In', 'Date Out', 'Branch', 'Location',
      'Received By', 'Total', 'Amount Paid', 'Remaining', 'Payment Status',
      'Line Item ID', 'Shoe Model', 'Services', 'Additional', 'Rush', 'Status'
    ];
    
    const csvContent = [
      headers.join(','),
      ...flattenedRecords.map(record => [
        `"${record.receiptId}"`,
        `"${record.customer}"`,
        `"${record.dateIn}"`,
        `"${record.dateOut}"`,
        `"${record.branch}"`,
        `"${record.branchLocation}"`,
        `"${record.receivedBy}"`,
        record.total,
        record.amountPaid,
        record.remainingBalance,
        `"${record.status}"`,
        `"${record.lineItemId}"`,
        `"${record.shoeModel}"`,
        `"${record.services}"`,
        `"${record.additional}"`,
        `"${record.rush}"`,
        `"${record.currentStatus}"`
      ].join(','))
    ].join('\n');
    
    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_export_${formatDateForFilename(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Export complete!");
  } catch (error) {
    console.error("Export failed:", error);
    toast.error("Failed to export data");
  }
}

// Helper functions
function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  return date instanceof Date ? date.toLocaleDateString() : '';
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0];
}
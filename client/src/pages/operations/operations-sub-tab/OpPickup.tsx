// src/components/OpPickup.tsx
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input"; // Added Input import
import { getLineItems } from "@/utils/api/getLineItems";
import { getCustomerContact } from "@/utils/api/getCustomerContact";
import { getPaymentStatus } from "@/utils/api/getPaymentStatus";
import { computePickupAllowance } from "@/utils/computePickupAllowance";
import { getUpdateColor } from "@/utils/getUpdateColor";
import { getCustomerName } from "@/utils/api/getCustomerName";
import { useLineItemUpdates } from "@/hooks/useLineItemUpdates";
import { 
  Search, 
  RefreshCw, 
  Phone, 
  Clock, 
  AlertCircle,
  CheckCircle2, 
  PackageCheck,
  Calendar,
  CreditCard,
  SortAsc,
  SortDesc,
  Filter
} from "lucide-react"; // Added Lucide icons

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

type Branch = "Valenzuela" | "SM Valenzuela" | "SM Grand";
type Location = "Branch" | "Hub" | "To Branch" | "To Hub";

type Row = {
  lineItemId: string;
  date: Date;
  customerId: string;
  customerName: string | null;
  shoe: string;
  service: string;
  branch: Branch;
  pickupNotice?: Date | null;
  allowanceDays: number;
  paymentStatus: "Paid" | "Unpaid" | "Partial";
  contact: string;
};

export default function OpPickup() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filteredRows, setFilteredRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
  const [customerNames, setCustomerNames] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Row | null>("pickupNotice");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  
  const { changes, isConnected, lastUpdate } = useLineItemUpdates();

  // Fetch customer names for all displayed rows
  const fetchCustomerNames = async (items: Row[]) => {
    const uniqueCustomerIds = [...new Set(items.map(item => item.customerId))];
    const newCustomerNames: Record<string, string | null> = {...customerNames};
    
    await Promise.all(uniqueCustomerIds.map(async (custId) => {
      // Skip already fetched names
      if (newCustomerNames[custId] !== undefined) return;
      
      const name = await getCustomerName(custId);
      newCustomerNames[custId] = name;
    }));
    
    setCustomerNames(newCustomerNames);
  };

  // Sort by pickup notice date
  const sortByPickupNotice = (items: Row[]) => {
    return [...items].sort((a, b) => {
      // Items with pickup notice come first, sorted by pickup notice date (oldest first)
      // Items without pickup notice come last, sorted by date
      if (a.pickupNotice && b.pickupNotice) {
        return a.pickupNotice.getTime() - b.pickupNotice.getTime();
      }
      if (a.pickupNotice && !b.pickupNotice) {
        return -1; // a comes first
      }
      if (!a.pickupNotice && b.pickupNotice) {
        return 1; // b comes first
      }
      // Both don't have pickup notice, sort by date
      return a.date.getTime() - b.date.getTime();
    });
  };

  // Fetch data function
  const fetchData = async () => {
    try {
      const items = await getLineItems("Ready for Pickup");
      const mappedRows: Row[] = await Promise.all(
        items.map(async (item: any) => {
          // Fetch customer contact and payment status
          const contact = await getCustomerContact(item.cust_id) ?? "";
          const paymentStatusRaw = await getPaymentStatus(item.transaction_id);
          let paymentStatus: "Paid" | "Unpaid" | "Partial" = "Unpaid";
          if (paymentStatusRaw === "PAID") paymentStatus = "Paid";
          else if (paymentStatusRaw === "PARTIAL") paymentStatus = "Partial";

          // Compute pickup notice and allowance
          const pickupNotice = item.pickUpNotice ? new Date(item.pickUpNotice) : null;
          const allowanceDays = computePickupAllowance(pickupNotice);

          return {
            lineItemId: item.line_item_id,
            date: new Date(item.latest_update),
            customerId: item.cust_id,
            customerName: null, // Will be populated later
            shoe: item.shoes,
            // Updated service mapping to use friendly names
            service: Array.isArray(item.services) && item.services.length > 0
              ? item.services.map((s: any) => SERVICE_ID_TO_NAME[s.service_id] || s.service_id).join(", ")
              : "",
            branch: item.branch_id as Branch,
            pickupNotice,
            allowanceDays,
            paymentStatus,
            contact,
          };
        })
      );
      
      // Sort items
      const sortedRows = sortByPickupNotice(mappedRows);
      setRows(sortedRows);
      
      // Fetch customer names
      void fetchCustomerNames(mappedRows);
    } catch (error) {
      console.error("Failed to fetch pickup items:", error);
      toast.error("Failed to load pickup data. Please try refreshing.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);
  
  // Update rows when customer names are fetched
  useEffect(() => {
    setRows(prev => prev.map(row => ({
      ...row,
      customerName: customerNames[row.customerId] || null
    })));
  }, [customerNames]);

  // Filtering and searching logic
  useEffect(() => {
    let filtered = [...rows];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(row =>
        row.lineItemId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.customerName || row.customerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.shoe.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.contact.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply payment status filter
    if (filterPayment !== 'all') {
      filtered = filtered.filter(row => {
        if (filterPayment === 'paid') return row.paymentStatus === 'Paid';
        if (filterPayment === 'unpaid') return row.paymentStatus === 'Unpaid';
        if (filterPayment === 'partial') return row.paymentStatus === 'Partial';
        return true;
      });
    }

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;
        
        return sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    setFilteredRows(filtered);
  }, [rows, searchTerm, filterPayment, sortField, sortDirection]);

  // Add real-time updates handling
  useEffect(() => {
    if (!changes) return;

    // Show toast notification for updates
    toast.info("Line item updated", { 
      id: "line-item-update",
      description: "Pickup queue updated with latest changes"
    });

    if (changes.operationType === "insert" || changes.operationType === "replace") {
      // Handle inserts or full replacements
      if (changes.fullDocument && changes.fullDocument.current_status === "Ready for Pickup") {
        // For pickup items, we need to refetch all data because of the complex mapping
        fetchData();
      }
    } 
    else if (changes.operationType === "update") {
      // Handle partial updates
      if (changes.documentKey && changes.documentKey._id) {
        const itemId = changes.documentKey._id;
        
        if (changes.fullDocument) {
          // We have the full updated document
          const item = changes.fullDocument;
          
          if (item.current_status === "Ready for Pickup") {
            // For pickup items, refetch all data to get updated contact/payment info
            fetchData();
          } else {
            // Item is no longer ready for pickup, remove it
            setRows(prev => prev.filter(r => r.lineItemId !== item.line_item_id));
          }
        } 
        else if (changes.updateDescription) {
          // Handle partial updates without full document
          const { updatedFields } = changes.updateDescription;
          
          // If status changed, we might need to remove the item
          if (updatedFields.current_status && updatedFields.current_status !== "Ready for Pickup") {
            setRows(prev => prev.filter(r => r.lineItemId !== itemId));
          } else {
            // For other field updates, fetch the complete data
            fetchData();
          }
        }
      }
    } 
    else if (changes.operationType === "delete") {
      // Handle deletions
      if (changes.documentKey && changes.documentKey._id) {
        setRows(prev => prev.filter(r => r.lineItemId !== changes.documentKey._id));
      }
    } 
    else {
      // For other operations or cases we can't handle specifically, refresh all data
      fetchData();
    }
  }, [changes]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleRowClick = (e: React.MouseEvent, rowId: string, rowIndex: number) => {
    if (e.shiftKey && lastIndex !== null) {
      const start = Math.min(lastIndex, rowIndex);
      const end = Math.max(lastIndex, rowIndex);
      const rangeIds = filteredRows.slice(start, end + 1).map((r) => r.lineItemId);
      setSelected(rangeIds);
    } else {
      setSelected((prev) =>
        prev.includes(rowId)
          ? prev.filter((id) => id !== rowId)
          : [...prev, rowId]
      );
      setLastIndex(rowIndex);
    }
  };

  const toggleCheckbox = (rowId: string, rowIndex: number) => {
    setSelected((prev) =>
      prev.includes(rowId)
        ? prev.filter((id) => id !== rowId)
        : [...prev, rowId]
    );
    setLastIndex(rowIndex);
  };

  const toggleExpand = (rowId: string) => {
    setExpanded((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  // Toggle select all functionality
  const toggleSelectAll = () => {
    if (selected.length === filteredRows.length) {
      // If all rows are selected, unselect all
      setSelected([]);
    } else {
      // Otherwise, select all rows
      setSelected(filteredRows.map(row => row.lineItemId));
    }
    setLastIndex(null);
  };

  const handleSort = (field: keyof Row) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof Row) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
  };

  const getHiddenColumns = () => {
    if (windowWidth <= 899) return ["Date", "Service", "Shoe", "Customer", "Contact"];
    if (windowWidth <= 1124) return ["Date", "Service", "Shoe"];
    if (windowWidth <= 1312) return ["Service"];
    return [];
  };

  const hiddenColumns = getHiddenColumns();

  // Calculate statistics
  const paidCount = rows.filter(row => row.paymentStatus === "Paid").length;
  const unpaidCount = rows.filter(row => row.paymentStatus === "Unpaid").length;
  const partialCount = rows.filter(row => row.paymentStatus === "Partial").length;
  const overdueCount = rows.filter(row => row.allowanceDays < 0).length;
  const notifiedCount = rows.filter(row => row.pickupNotice).length;

  return (
    <div className="op-container">
      {/* Table */}
      <Table className="op-table">
        <TableHeader className="op-header">
          <TableRow className="op-header-row">
            <TableCell className="op-head-action">
              <input
                type="checkbox"
                checked={filteredRows.length > 0 && selected.length === filteredRows.length}
                ref={(checkbox) => {
                  if (checkbox) {
                    checkbox.indeterminate = selected.length > 0 && selected.length < filteredRows.length;
                  }
                }}
                onChange={toggleSelectAll}
                disabled={filteredRows.length === 0}
              />
            </TableCell>
            <TableHead className="op-pu-head-transact cursor-pointer hover:bg-gray-50" onClick={() => handleSort('lineItemId')}>
              <div className="flex items-center gap-1">
                <h5>Line Item ID</h5>
                {getSortIcon('lineItemId')}
              </div>
            </TableHead>
            <TableHead className="op-pu-head-date cursor-pointer hover:bg-gray-50" onClick={() => handleSort('date')}>
              <div className="flex items-center gap-1">
                <h5>Date</h5>
                {getSortIcon('date')}
              </div>
            </TableHead>
            <TableHead className="op-pu-head-customer cursor-pointer hover:bg-gray-50" onClick={() => handleSort('customerName')}>
              <div className="flex items-center gap-1">
                <h5>Customer</h5>
                {getSortIcon('customerName')}
              </div>
            </TableHead>
            <TableHead className="op-pu-head-shoe"><h5>Shoe</h5></TableHead>
            <TableHead className="op-pu-head-service"><h5>Service</h5></TableHead>
            <TableHead className="op-pu-head-branch cursor-pointer hover:bg-gray-50" onClick={() => handleSort('branch')}>
              <div className="flex items-center gap-1">
                <h5>Branch</h5>
                {getSortIcon('branch')}
              </div>
            </TableHead>
            <TableHead className="op-pu-head-pickup-notice cursor-pointer hover:bg-gray-50" onClick={() => handleSort('pickupNotice')}>
              <div className="flex items-center gap-1">
                <h5>Pickup Notice</h5>
                {getSortIcon('pickupNotice')}
              </div>
            </TableHead>
            <TableHead className="op-pu-head-payment-status cursor-pointer hover:bg-gray-50" onClick={() => handleSort('paymentStatus')}>
              <div className="flex items-center gap-1">
                <h5>Payment Status</h5>
                {getSortIcon('paymentStatus')}
              </div>
            </TableHead>
            <TableHead className="op-pu-head-contact"><h5>Contact</h5></TableHead>
            {hiddenColumns.length > 0 && <TableHead className="op-pu-head-chevron"></TableHead>}
          </TableRow>
        </TableHeader>

        <TableBody className="op-body">
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Loading pickup data...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : filteredRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                {searchTerm || filterPayment !== 'all' ? 'No items match your filters' : 'No items ready for pickup'}
              </TableCell>
            </TableRow>
          ) : (
            filteredRows.map((row, index) => (
              <React.Fragment key={row.lineItemId}>
                <TableRow
                  className={`op-body-row ${selected.includes(row.lineItemId) ? "selected" : ""}`}
                  onClick={(e) => handleRowClick(e, row.lineItemId, index)}
                >
                  <TableCell className={`op-body-action ${getUpdateColor(row.date)}`} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.includes(row.lineItemId)}
                      onChange={() => toggleCheckbox(row.lineItemId, index)}
                    />
                  </TableCell>
                  <TableCell className={`op-pu-body-transact ${getUpdateColor(row.date)}`}><h5>{row.lineItemId}</h5></TableCell>
                  <TableCell className={`op-pu-body-date ${getUpdateColor(row.date)}`}><small>{row.date.toLocaleDateString()}</small></TableCell>
                  <TableCell className={`op-pu-body-customer ${getUpdateColor(row.date)}`}>
                    <small>{row.customerName || row.customerId}</small>
                  </TableCell>
                  <TableCell className={`op-pu-body-shoe ${getUpdateColor(row.date)}`}><small>{row.shoe}</small></TableCell>
                  <TableCell className={`op-pu-body-service ${getUpdateColor(row.date)}`}><small>{row.service}</small></TableCell>
                  <TableCell className={`op-pu-body-branch ${getUpdateColor(row.date)}`}><small>{row.branch}</small></TableCell>
                  <TableCell className={`op-pu-body-pickup-notice ${getUpdateColor(row.date)}`}>
                    {row.pickupNotice ? (
                      <>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          <small>{row.pickupNotice.toLocaleDateString()}</small>
                        </div>
                        <div className={
                          row.allowanceDays <= 0
                            ? "text-red-600 flex items-center gap-1"
                            : row.allowanceDays <= 3
                            ? "text-yellow-600 flex items-center gap-1"
                            : "text-green-600 flex items-center gap-1"
                        }>
                          <Clock className="w-3 h-3" />
                          <small>
                            {row.allowanceDays > 0
                              ? `${row.allowanceDays} days left`
                              : `${Math.abs(row.allowanceDays)} days overdue`}
                          </small>
                        </div>
                      </>
                    ) : (
                      <small className="text-gray-400">Not notified</small>
                    )}
                  </TableCell>
                  <TableCell className={`op-pu-body-payment-status ${getUpdateColor(row.date)}`}>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                        row.paymentStatus === "Paid"
                          ? "bg-green-100 text-green-800"
                          : row.paymentStatus === "Partial"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      <CreditCard className="w-3 h-3" />
                      {row.paymentStatus}
                    </span>
                  </TableCell>
                  <TableCell className={`op-pu-body-contact ${getUpdateColor(row.date)}`}>
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-500" />
                      <small>{row.contact || "No contact"}</small>
                    </div>
                  </TableCell>
                  {hiddenColumns.length > 0 && (
                    <TableCell className={`op-pu-body-dropdown-toggle ${getUpdateColor(row.date)}`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(row.lineItemId); }}
                        className={`chevron-btn ${expanded.includes(row.lineItemId) ? "rotate-180" : ""}`}
                      >
                        ▾
                      </button>
                    </TableCell>
                  )}
                </TableRow>
                
                {/* Dropdown card for hidden columns */}
                {expanded.includes(row.lineItemId) && hiddenColumns.length > 0 && (
                  <TableRow className="op-body-dropdown-row">
                    <TableCell colSpan={10} className="op-dropdown-cell">
                      <div className="op-dropdown-card">
                        {hiddenColumns.includes("Date") && (
                          <div><h5 className="label">Date</h5> <h5 className="name">{row.date.toLocaleDateString()}</h5></div>
                        )}
                        {hiddenColumns.includes("Customer") && (
                          <div><h5 className="label">Customer</h5> <h5 className="name">{row.customerName || row.customerId}</h5></div>
                        )}
                        {hiddenColumns.includes("Shoe") && (
                          <div><h5 className="label">Shoe</h5> <h5 className="name">{row.shoe}</h5></div>
                        )}
                        {hiddenColumns.includes("Service") && (
                          <div><h5 className="label">Service</h5> <h5 className="name">{row.service}</h5></div>
                        )}
                        {hiddenColumns.includes("Branch") && (
                          <div><h5 className="label">Branch</h5> <h5 className="name">{row.branch}</h5></div>
                        )}
                        {hiddenColumns.includes("Contact") && (
                          <div><h5 className="label">Contact</h5> <h5 className="name">{row.contact}</h5></div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))
          )}
        </TableBody>
      </Table>

      {/* Modernized Bottom Action Bar */}
      <div className="op-below-container flex flex-wrap justify-between items-center gap-3 mt-2">
        {/* Left side - Search, Filter, and Stats */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-6 h-8 w-40 text-sm border-gray-300 focus:border-blue-500"
            />
          </div>

          {/* Payment Status Filter */}
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value as 'all' | 'paid' | 'unpaid' | 'partial')}
            className="px-2 py-1 border border-gray-300 rounded text-xs bg-white h-8 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid Only</option>
            <option value="partial">Partial Only</option>
            <option value="unpaid">Unpaid Only</option>
          </select>

          {/* Modern Stats with Text Labels */}
          <div className="flex items-center gap-3 text-sm bg-gray-50 px-3 py-1 rounded-md border">
            <span className="flex items-center gap-1 text-blue-600">
              <PackageCheck className="w-3 h-3" />
              <span className="font-medium">{filteredRows.length}</span>
              <span className="hidden sm:inline text-xs text-blue-500">Items</span>
            </span>
            
            <span className="w-px h-3 bg-gray-300"></span>
            <span className="flex items-center gap-1 text-blue-600">
              <Calendar className="w-3 h-3" />
              <span className="font-medium">{notifiedCount}</span>
              <span className="hidden sm:inline text-xs text-blue-500">Notified</span>
            </span>
            
            {overdueCount > 0 && (
              <>
                <span className="w-px h-3 bg-gray-300"></span>
                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  <span className="font-medium">{overdueCount}</span>
                  <span className="hidden sm:inline text-xs text-red-500">Overdue</span>
                </span>
              </>
            )}
          </div>
        </div>
        
        {/* Right side - Selection count, Status, and Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Modern Selection Counter */}
          {selected.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
              <CheckCircle2 className="w-3 h-3 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                {selected.length} <span>selected</span>
              </span>
            </div>
          )}

          {/* Connection Status */}
          <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-md">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-xs text-gray-600">
              {isConnected ? 'Live' : 'Offline'}
              <span className="hidden sm:inline">
                {lastUpdate && ` • ${lastUpdate.toLocaleTimeString()}`}
              </span>
            </span>
          </div>

          {isLoading && (
            <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span className="text-xs font-medium hidden xs:inline">Syncing...</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchData}
              className="op-btn text-white button-md flex items-center gap-1 hover:opacity-90 transition-opacity"
              title="Refresh data"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Payment Status Summary */}
      {rows.length > 0 && (
        <div className="mt-4 p-2 bg-gray-50 rounded-md border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Payment Status Summary</div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-sm">{paidCount} Paid</span>
              <span className="text-xs text-gray-500">({((paidCount / rows.length) * 100).toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span className="text-sm">{partialCount} Partial</span>
              <span className="text-xs text-gray-500">({((partialCount / rows.length) * 100).toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-sm">{unpaidCount} Unpaid</span>
              <span className="text-xs text-gray-500">({((unpaidCount / rows.length) * 100).toFixed(0)}%)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

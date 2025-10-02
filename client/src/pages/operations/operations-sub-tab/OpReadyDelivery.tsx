// src/components/OpReadyDelivery.tsx
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
import { Input } from "@/components/ui/input";

import ToWarehouseModal from "@/components/operations/modals/OpRDModal"
import { getLineItems } from "@/utils/api/getLineItems";
import { editLineItemStatus } from "@/utils/api/editLineItemStatus";
import { updateDates } from "@/utils/api/updateDates";
import { getUpdateColor } from "@/utils/getUpdateColor";
import { updateLineItemLocation } from "@/utils/api/editLocation";
import { getCustomerName } from "@/utils/api/getCustomerName";
import { useLineItemUpdates } from "@/hooks/useLineItemUpdates";
import { 
  Search, 
  RefreshCw, 
  Package, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Filter,
  SortAsc,
  SortDesc,
  Warehouse
} from "lucide-react";

type Branch = "Valenzuela" | "SM Valenzuela" | "SM Grand";
type Location = "Branch" | "Hub" | "To Branch" | "To Hub";

type Row = {
  lineItemId: string;
  date: Date;
  customer: string;
  shoe: string;
  service: string;
  branch: Branch;
  Location: Location;
  status: string;
  isRush: boolean;
  dueDate: Date;  
  updated: Date;
  customerId: string;
  customerName: string | null;
};

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
}

export default function OpReadyDelivery({ readOnly = false }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [filteredRows, setFilteredRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
  const [modalOpen, setModalOpen] = useState(false);
  const [customerNames, setCustomerNames] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Row | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterBranch, setFilterBranch] = useState<'all' | Branch>('all');
  
  const { changes, isConnected, lastUpdate } = useLineItemUpdates();

  // --- helpers ---
  const mapItem = (item: any): Row => ({
    lineItemId: item.line_item_id,
    date: new Date(item.latest_update),
    customer: item.cust_id,
    shoe: item.shoes,
    service: item.services?.map((s: any) => SERVICE_ID_TO_NAME[s.service_id] || s.service_id).join(", ") || "",
    branch: item.branch_id as Branch,
    Location: item.current_location as Location,
    status: item.current_status,
    isRush: item.priority === "Rush",
    dueDate: item.due_date ? new Date(item.due_date) : new Date(),
    updated: new Date(item.latest_update),
    customerId: item.cust_id,
    customerName: customerNames[item.cust_id] || null,
  });

  const mapItems = (items: any[]): Row[] => items.map(mapItem);

  const sortByDueDate = (items: Row[]) =>
    [...items].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

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
        row.branch.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply branch filter
    if (filterBranch !== 'all') {
      filtered = filtered.filter(row => row.branch === filterBranch);
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
  }, [rows, searchTerm, filterBranch, sortField, sortDirection]);

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

  // Fetch line items from API -- Initial fetch
  const fetchData = async () => {
    try {
      const data = await getLineItems("Ready for Delivery");
      const mappedItems = mapItems(data);
      const sortedItems = sortByDueDate(mappedItems);
      setRows(sortedItems);
      
      // Fetch customer names
      void fetchCustomerNames(mappedItems);
    } catch (error) {
      console.error("Failed to fetch line items:", error);
      toast.error("Failed to load ready for delivery data. Please try refreshing.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // update windowWidth on resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update rows when customer names are fetched
  useEffect(() => {
    setRows(prev => prev.map(row => ({
      ...row,
      customerName: customerNames[row.customerId] || null
    })));
  }, [customerNames]);

  // Select all functionality
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

  // Disable selection logic if readOnly
  const handleRowClick = readOnly ? undefined : (
    e: React.MouseEvent,
    rowId: string,
    rowIndex: number
  ) => {
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

  const toggleCheckbox = readOnly ? undefined : (rowId: string, rowIndex: number) => {
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

  // determine hidden columns per breakpoint
  const getHiddenColumns = () => {
    if (windowWidth <= 899) return ["Action", "Customer", "Due", "Branch", "Mod", "Shoe", "Date", "Location", "Status"];
    if (windowWidth <= 1124) return ["Mod", "Shoe", "Date", "Location", "Status"];
    if (windowWidth <= 1312) return ["Location", "Status"];
    return [];
  };

  const hiddenColumns = getHiddenColumns();

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

  // Add real-time updates handling
  useEffect(() => {
    if (!changes) return;

    // Show toast notification for updates
    toast.info("Line item updated", { 
      id: "line-item-update",
      description: "Ready for delivery updated with latest changes"
    });

    if (changes.operationType === "insert" || changes.operationType === "replace") {
      // Handle inserts or full replacements
      if (changes.fullDocument && changes.fullDocument.current_status === "Ready for Delivery") {
        const item = changes.fullDocument;
        const newRow = mapItem(item);
        
        // Fetch customer name if needed
        if (!customerNames[item.cust_id]) {
          getCustomerName(item.cust_id).then(name => {
            setCustomerNames(prev => ({...prev, [item.cust_id]: name}));
          });
        }
        
        setRows(prev => {
          const exists = prev.find(r => r.lineItemId === item.line_item_id);
          return exists 
            ? sortByDueDate(prev.map(r => r.lineItemId === item.line_item_id ? newRow : r))
            : sortByDueDate([...prev, newRow]);
        });
      }
    } 
    else if (changes.operationType === "update") {
      // Handle partial updates
      if (changes.documentKey && changes.documentKey._id) {
        const itemId = changes.documentKey._id;
        
        if (changes.fullDocument) {
          // We have the full updated document
          const item = changes.fullDocument;
          
          if (item.current_status === "Ready for Delivery") {
            const updatedRow = mapItem(item);
            
            // Fetch customer name if needed
            if (!customerNames[item.cust_id]) {
              getCustomerName(item.cust_id).then(name => {
                setCustomerNames(prev => ({...prev, [item.cust_id]: name}));
              });
            }
            
            setRows(prev => sortByDueDate(
              prev.map(r => r.lineItemId === item.line_item_id ? updatedRow : r)
            ));
          } else {
            // Item is no longer ready for delivery, remove it
            setRows(prev => prev.filter(r => r.lineItemId !== item.line_item_id));
          }
        } 
        else if (changes.updateDescription) {
          // Handle partial updates without full document
          const { updatedFields } = changes.updateDescription;
          
          // If status changed, we might need to remove the item
          if (updatedFields.current_status && updatedFields.current_status !== "Ready for Delivery") {
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

  // Calculate statistics for branches
  const branchCounts = rows.reduce((counts, row) => {
    counts[row.branch] = (counts[row.branch] || 0) + 1;
    return counts;
  }, {} as Record<Branch, number>);
  
  const rushCount = rows.filter(row => row.isRush).length;
  const overdueCount = rows.filter(row => row.dueDate < new Date()).length;

  return (
    <div className="op-container">
      <Table className="op-table">
        <TableHeader className="op-header">
          <TableRow className="op-header-row">
            <TableCell className="op-head-action">
              {!readOnly && (
                <input
                  type="checkbox"
                  checked={filteredRows.length > 0 && selected.length === filteredRows.length}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = selected.length > 0 && selected.length < filteredRows.length;
                    }
                  }}
                  onChange={toggleSelectAll}
                  disabled={filteredRows.length === 0}
                />
              )}
            </TableCell>
            <TableHead className="op-head-transact cursor-pointer hover:bg-gray-50" onClick={() => !readOnly && handleSort('lineItemId')}>
              <div className="flex items-center gap-1">
                <h5>Line Item ID</h5>
                {!readOnly && getSortIcon('lineItemId')}
              </div>
            </TableHead>
            <TableHead className="op-head-date cursor-pointer hover:bg-gray-50" onClick={() => !readOnly && handleSort('date')}>
              <div className="flex items-center gap-1">
                <h5>Date</h5>
                {!readOnly && getSortIcon('date')}
              </div>
            </TableHead>
            <TableHead className="op-head-customer cursor-pointer hover:bg-gray-50" onClick={() => !readOnly && handleSort('customerName')}>
              <div className="flex items-center gap-1">
                <h5>Customer</h5>
                {!readOnly && getSortIcon('customerName')}
              </div>
            </TableHead>
            <TableHead className="op-head-shoe"><h5>Shoe</h5></TableHead>
            <TableHead className="op-head-service"><h5>Service</h5></TableHead>
            <TableHead className="op-head-branch cursor-pointer hover:bg-gray-50" onClick={() => !readOnly && handleSort('branch')}>
              <div>
                <h5>Branch</h5>
                {!readOnly && getSortIcon('branch')}
              </div>
            </TableHead>
            <TableHead className="op-head-location"><h5>Location</h5></TableHead>
            <TableHead className="op-head-status"><h5>Status</h5></TableHead>
            <TableHead className="op-head-rush"><h5>Priority</h5></TableHead>
            <TableHead className="op-head-due cursor-pointer hover:bg-gray-50" onClick={() => !readOnly && handleSort('dueDate')}>
              <div className="flex items-center gap-1">
                <h5>Due Date</h5>
                {!readOnly && getSortIcon('dueDate')}
              </div>
            </TableHead>
            <TableHead className="op-head-mod cursor-pointer hover:bg-gray-50" onClick={() => !readOnly && handleSort('updated')}>
              <div className="flex items-center gap-1">
                <h5>Updated</h5>
                {!readOnly && getSortIcon('updated')}
              </div>
            </TableHead>
            {hiddenColumns.length > 0 && (
              <TableHead className="op-head-chevron"></TableHead>
            )}
          </TableRow>
        </TableHeader>

        <TableBody className="op-body">
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-8">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Loading delivery data...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : filteredRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                {searchTerm || filterBranch !== 'all' ? 'No items match your filters' : 'No items ready for delivery'}
              </TableCell>
            </TableRow>
          ) : (
            filteredRows.map((row, index) => (
              <React.Fragment key={row.lineItemId}>
                <TableRow
                  className={`op-body-row ${selected.includes(row.lineItemId) ? "selected" : ""} ${readOnly ? "read-only-row" : ""}`}
                  onClick={handleRowClick ? (e) => handleRowClick(e, row.lineItemId, index) : undefined}
                  style={readOnly ? { pointerEvents: "none", opacity: 0.7 } : {}}
                >
                  <TableCell className={`op-body-action ${getUpdateColor(row.updated)}`} onClick={(e) => e.stopPropagation()}>
                    {!readOnly && (
                      <input
                        type="checkbox"
                        checked={selected.includes(row.lineItemId)}
                        onChange={() => toggleCheckbox && toggleCheckbox(row.lineItemId, index)}
                      />
                    )}
                  </TableCell>
                  <TableCell className={`op-body-transact ${getUpdateColor(row.updated)}`}><h5>{row.lineItemId}</h5></TableCell>
                  <TableCell className={`op-body-date ${getUpdateColor(row.updated)}`}><small>{row.date.toLocaleDateString()}</small></TableCell>
                  <TableCell className={`op-body-customer ${getUpdateColor(row.updated)}`}>
                    <small>{row.customerName || row.customerId}</small>
                  </TableCell>
                  <TableCell className={`op-body-shoe ${getUpdateColor(row.updated)}`}><small>{row.shoe}</small></TableCell>
                  <TableCell className={`op-body-service ${getUpdateColor(row.updated)}`}><small>{row.service}</small></TableCell>
                  <TableCell className={`op-body-branch ${getUpdateColor(row.updated)}`}><small>{row.branch}</small></TableCell>
                  <TableCell className={`op-body-location ${getUpdateColor(row.updated)}`}><small>{row.Location}</small></TableCell>
                  <TableCell className={`op-body-status op-status-rd ${getUpdateColor(row.updated)}`}><h5>{row.status}</h5></TableCell>
                  <TableCell className={`op-body-rush ${getUpdateColor(row.updated)}`}>
                    {row.isRush ? (
                      <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm font-medium">Rush</span>
                    ) : (
                      <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-medium">Normal</span>
                    )}
                  </TableCell>
                  <TableCell className={`op-body-due ${getUpdateColor(row.updated)}`}>
                    <small className={row.dueDate < new Date() ? 'text-red-600 font-medium' : ''}>
                      {row.dueDate.toLocaleDateString()}
                    </small>
                  </TableCell>
                  <TableCell className={`op-body-mod ${getUpdateColor(row.updated)}`}><small>{row.updated.toLocaleDateString()}</small></TableCell>
                  {hiddenColumns.length > 0 && (
                    <TableCell className={`op-body-dropdown-toggle ${getUpdateColor(row.updated)}`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(row.lineItemId); }}
                        className={`chevron-btn ${expanded.includes(row.lineItemId) ? "rotate-180" : ""}`}
                      >
                        ▾
                      </button>
                    </TableCell>
                  )}
                </TableRow>

                {/* Dropdown card */}
                {expanded.includes(row.lineItemId) && hiddenColumns.length > 0 && (
                  <TableRow className="op-body-dropdown-row">
                    <TableCell colSpan={12} className="op-dropdown-cell">
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
                        {hiddenColumns.includes("Location") && (
                          <div><h5 className="label">Location</h5> <h5 className="name">{row.Location}</h5></div>
                        )}
                        {hiddenColumns.includes("Status") && (
                          <div><h5 className="label">Status</h5> <h5 className="name">{row.status}</h5></div>
                        )}
                        {hiddenColumns.includes("Priority") && (
                          <div><h5 className="label">Priority</h5> <h5 className="name">{row.isRush ? "Rush" : "Normal"}</h5></div>
                        )}
                        {hiddenColumns.includes("Due") && (
                          <div><h5 className="label">Due Date</h5> <h5 className="name">{row.dueDate.toLocaleDateString()}</h5></div>
                        )}
                        {hiddenColumns.includes("Mod") && (
                          <div><h5 className="label">Updated</h5> <h5 className="name">{row.updated.toLocaleDateString()}</h5></div>
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
          {!readOnly && (
            <>
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

              {/* Branch Filter */}
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value as 'all' | Branch)}
                className="px-2 py-1 border border-gray-300 rounded text-xs bg-white h-8 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Branches</option>
                <option value="VAL-B-NCR">Valenzuela</option>
                <option value="SMVAL-B-NCR">SM Valenzuela</option>
                <option value="SMGRA-B-NCR">SM Grand</option>
              </select>
            </>
          )}

          {/* Modern Stats with Text Labels */}
          <div className="flex items-center gap-3 text-sm bg-gray-50 px-3 py-1 rounded-md border">
            <span className="flex items-center gap-1 text-blue-600">
              <Package className="w-3 h-3" />
              <span className="font-medium">{filteredRows.length}</span>
              <span className="hidden sm:inline text-xs text-blue-500">Items</span>
            </span>
            <span className="w-px h-3 bg-gray-300"></span>
            <span className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-3 h-3" />
              <span className="font-medium">{rushCount}</span>
              <span className="hidden sm:inline text-xs text-red-500">Rush</span>
            </span>
            {overdueCount > 0 && (
              <>
                <span className="w-px h-3 bg-gray-300"></span>
                <span className="flex items-center gap-1 text-red-600">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">{overdueCount}</span>
                  <span className="hidden sm:inline text-xs text-red-500">Overdue</span>
                </span>
              </>
            )}
          </div>
        </div>
        
        {/* Right side - Connection Status and Actions */}
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
          <CheckCircle2 className="w-3 h-3 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            {selected.length} <span>selected</span>
          </span>
        </div>


        <div className="flex flex-wrap items-center gap-3">
          {/* Connection Status - MOVED HERE */}
          <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-md">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-xs text-gray-600">
              {isConnected ? 'Live' : 'Offline'}
              <span className="hidden sm:inline">
                {lastUpdate && ` • ${lastUpdate.toLocaleTimeString()}`}
              </span>
            </span>
          </div>

          {/* Loading Indicator - MOVED HERE */}
          {isLoading && (
            <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span className="text-xs font-medium hidden xs:inline">Syncing...</span>
            </div>
          )}

          {!readOnly && (
            <>
              <button 
                onClick={fetchData}
                className="op-btn text-white button-md flex items-center gap-1 hover:opacity-90 transition-opacity"
                title="Refresh data"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium hidden sm:inline">Refresh</span>
              </button>
              
              <button
                className="op-btn-rd op-btn text-white bg-[#1447E6] button-md disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selected.length === 0}
                onClick={() => setModalOpen(true)}
              >
                <h5>Move To Warehouse</h5>
              </button>
            </>
          )}
        </div>
      </div>

      <ToWarehouseModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        selectedCount={selected.length}
        onConfirm={async () => {
          try {
            // Update Dates for each selected line item
            const now = new Date().toISOString();
            await Promise.all(
              selected.map(async (lineItemId) => {
                try {
                  await updateDates(lineItemId, {
                    ibd_date: now,
                    current_status: 3,
                  });
                } catch (err) {
                  console.error(`Failed to update Dates for ${lineItemId}:`, err);
                }
              })
            );

            // Update status to "Incoming Branch Delivery"
            await editLineItemStatus(selected, "Incoming Branch Delivery");

            // Update location to "Hub" for all selected items
            await Promise.all(
              selected.map(async (lineItemId) => {
                try {
                  await updateLineItemLocation(lineItemId, "Hub");
                } catch (err) {
                  console.error(`Failed to update location for ${lineItemId}:`, err);
                }
              })
            );

            setRows((prevRows) =>
              prevRows.filter((row) => !selected.includes(row.lineItemId))
            );
            setSelected([]);
            setModalOpen(false);
            toast.success("Selected items moved to warehouse!"); // Success toast
          } catch (error) {
            console.error("Failed to update line items status:", error);
            toast.error("Failed to update items. Please try again."); // Error toast
          }
        }}
      />
    </div>
  );
}

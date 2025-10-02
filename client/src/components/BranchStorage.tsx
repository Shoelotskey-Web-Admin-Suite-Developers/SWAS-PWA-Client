import React, { useState, useEffect, useCallback } from 'react';
import '@/styles/components/branchStorage.css'
import { Card, CardContent } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { getLineItemsByBranch } from '@/utils/api/getLineItemsByBranch';
import { getLineItemsByLocation } from '@/utils/api/getLineItemsByLocation';
import { useLineItemUpdates } from '@/hooks/useLineItemUpdates';
import { WarehouseIcon, StoreIcon } from 'lucide-react';

type BranchData = {
  name: string;
  branchId: string;
  shoeCount: number;
  storageFilled: number;
};

type WarehouseData = {
  shoeCount: number;
  storageFilled: number;
};

const BRANCH_MAX_CAPACITY = 300;
const WAREHOUSE_MAX_CAPACITY = 1000;

// Define branch IDs outside component to avoid recreations
const BRANCH_CONFIG = [
  { name: "SM Grand", branchId: "SMGRA-B-NCR" },
  { name: "SM Valenzuela", branchId: "SMVAL-B-NCR" },
  { name: "Valenzuela", branchId: "VAL-B-NCR" },
];

export default function BranchStorage() {
  const [branchData, setBranchData] = useState<BranchData[]>(
    BRANCH_CONFIG.map(branch => ({
      ...branch,
      shoeCount: 0,
      storageFilled: 0
    }))
  );
  const [warehouseData, setWarehouseData] = useState<WarehouseData>({
    shoeCount: 0,
    storageFilled: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // Use our socket hook to get real-time updates
  const { changes } = useLineItemUpdates();

  // Function to fetch all storage data - remove branchData from dependencies
  const fetchStorageData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch data for all branches using fixed BRANCH_CONFIG instead of state
      const branchPromises = BRANCH_CONFIG.map(async (branch) => {
        // Get all items assigned to this branch
        const items = await getLineItemsByBranch(branch.branchId);
        
        // Only count items that BOTH:
        // 1. Have the correct branch ID (already filtered by API)
        // 2. Are physically located at the branch (current_location === "Branch")
        const itemsPhysicallyAtBranch = items.filter(item => 
          item.branch_id === branch.branchId && 
          item.current_location === "Branch"
        );
        
        const shoeCount = itemsPhysicallyAtBranch.length;
        const storageFilled = Math.round((shoeCount / BRANCH_MAX_CAPACITY) * 100);
        
        return {
          ...branch,
          shoeCount,
          storageFilled: Math.min(100, storageFilled), // Ensure it doesn't go above 100
        };
      });

      // Fetch warehouse data - only count items that are physically at the Hub
      const warehouseItems = await getLineItemsByLocation("Hub");
      const warehouseShoeCount = warehouseItems.length;
      const warehouseStorageFilled = Math.round((warehouseShoeCount / WAREHOUSE_MAX_CAPACITY) * 100);

      // Update state
      const updatedBranchData = await Promise.all(branchPromises);
      setBranchData(updatedBranchData);
      setWarehouseData({
        shoeCount: warehouseShoeCount,
        storageFilled: Math.min(100, warehouseStorageFilled), // Ensure it doesn't go above 100
      });

    } catch (error) {
      console.error("Error fetching storage data:", error);
    } finally {
      setLoading(false);
    }
  }, []); // Remove branchData from dependencies!

  // Initial data fetch on component mount
  useEffect(() => {
    fetchStorageData();
  }, [fetchStorageData]);

  // Add debounce to prevent multiple rapid updates
  useEffect(() => {
    if (changes) {
      console.log("Updating storage data due to line item changes");
      
      // Simple debounce implementation
      const timer = setTimeout(() => {
        fetchStorageData();
      }, 300);
      
      // Clean up timer
      return () => clearTimeout(timer);
    }
  }, [changes, fetchStorageData]);

  const renderBranchStats = (branch: BranchData) => (
    <div className='branch-storage-stats' key={branch.branchId}>
      <div className='branch-header'>
        <StoreIcon className="location-icon" />
        <h4 className='location-title'>{branch.name}</h4>
      </div>
      <div className='stats-container'>
        <div className='stat-item'>
          <span className='stat-value'>{loading ? "..." : branch.shoeCount}</span>
          <span className='stat-label'>Shoes</span>
        </div>
        <div className='stat-divider'></div>
        <div className='stat-item'>
          <div className='capacity-wrapper'>
            <span className='stat-value'>{loading ? "..." : `${branch.storageFilled}%`}</span>
            <div className='capacity-bar-container'>
              <div 
                className={`capacity-bar ${branch.storageFilled > 85 ? 'critical' : branch.storageFilled > 70 ? 'warning' : 'normal'}`} 
                style={{ width: `${loading ? 0 : branch.storageFilled}%` }}
              ></div>
            </div>
          </div>
          <span className='stat-label'>Storage Filled</span>
        </div>
      </div>
    </div>
  );

  const renderWarehouseStats = () => (
    <div className='branch-storage-stats warehouse'>
      <div className='branch-header'>
        <WarehouseIcon className="location-icon" />
        <h4 className='location-title'>Warehouse</h4>
      </div>
      <div className='stats-container'>
        <div className='stat-item'>
          <span className='stat-value'>{loading ? "..." : warehouseData.shoeCount}</span>
          <span className='stat-label'>Shoes</span>
        </div>
        <div className='stat-divider'></div>
        <div className='stat-item'>
          <div className='capacity-wrapper'>
            <span className='stat-value'>{loading ? "..." : `${warehouseData.storageFilled}%`}</span>
            <div className='capacity-bar-container'>
              <div 
                className={`capacity-bar ${warehouseData.storageFilled > 85 ? 'critical' : warehouseData.storageFilled > 70 ? 'warning' : 'normal'}`} 
                style={{ width: `${loading ? 0 : warehouseData.storageFilled}%` }}
              ></div>
            </div>
          </div>
          <span className='stat-label'>Storage Filled</span>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className='pc-tablet'>
        <Card className='branch-card'>
          <CardContent className='op-branch-card-contents'>
            {branchData.map(renderBranchStats)}
            {renderWarehouseStats()}
          </CardContent>
        </Card>
      </div>

      <div className='landscape-mobile'>
        <Card className='mobile-card'>
          <CardContent>
            <Carousel className='carousel'>
              <CarouselContent>
                <CarouselItem className='carousel-item'>
                  {branchData.slice(0, 2).map(renderBranchStats)}
                </CarouselItem>
                <CarouselItem className='carousel-item'>
                  {renderBranchStats(branchData[2])}
                  {renderWarehouseStats()}
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </CardContent>
        </Card>
      </div>
      
      <div className='mobile'>
        <Card className='mobile-card'>
          <CardContent>
            <Carousel className='carousel'>
              <CarouselContent>
                {branchData.map(branch => (
                  <CarouselItem key={branch.branchId}>
                    {renderBranchStats(branch)}
                  </CarouselItem>
                ))}
                <CarouselItem>
                  {renderWarehouseStats()}
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
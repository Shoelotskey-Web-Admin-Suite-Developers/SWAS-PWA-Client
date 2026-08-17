import { useState, useEffect, useCallback, useMemo } from 'react';
import '@/styles/components/branchStorage.css'
import { getBranches } from '@/utils/api/getBranches';
import { getBranchType } from '@/utils/api/getBranchType';
import { getLineItemsByBranch } from '@/utils/api/getLineItemsByBranch';
import { getLineItemsByLocation } from '@/utils/api/getLineItemsByLocation';
import { useLineItemUpdates } from '@/hooks/useLineItemUpdates';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

type BranchApi = {
  branch_id: string;
  branch_name?: string;
  name?: string;
  location?: string;
  branch_location?: string;
  type?: string;
  branch_type?: string;
}

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

// Skeleton loader components
const BranchStatsSkeleton = () => (
  <div className='branch-storage-stats skeleton'>
    <div className='branch-header'>
      <div className='branch-info'>
        <div className='skeleton-title'></div>
        <div className='branch-metric-row'>
          <div className='skeleton-value'></div>
          <div className='skeleton-unit'></div>
        </div>
      </div>
      <div className='skeleton-icon'></div>
    </div>
    <div className='storage-row'>
      <div className='skeleton-label'></div>
      <div className='skeleton-percent'></div>
    </div>
    <div className='capacity-bar-container'>
      <div className='capacity-bar skeleton-bar'></div>
    </div>
  </div>
);

const WarehouseStatsSkeleton = () => (
  <div className='branch-storage-stats warehouse skeleton'>
    <div className='branch-header'>
      <div className='branch-info'>
        <div className='skeleton-title'></div>
        <div className='branch-metric-row'>
          <div className='skeleton-value'></div>
          <div className='skeleton-unit'></div>
        </div>
      </div>
      <div className='skeleton-icon'></div>
    </div>
    <div className='storage-row'>
      <div className='skeleton-label'></div>
      <div className='skeleton-percent'></div>
    </div>
    <div className='capacity-bar-container'>
      <div className='capacity-bar skeleton-bar'></div>
    </div>
  </div>
);

// Skeleton carousel renderer
const renderSkeletonCarousel = (itemsPerSlide: number) => {
  const skeletonItems = Array(itemsPerSlide).fill(null);
  const groups = [];
  for (let i = 0; i < Math.ceil(4 / itemsPerSlide); i++) {
    groups.push(skeletonItems);
  }

  return (
    <Carousel className='carousel'>
      <CarouselContent className='carousel-content'>
        {groups.map((group, index) => (
          <CarouselItem className='carousel-item' key={`skeleton-group-${index}`}>
            {group.map((_, idx) => (
              <BranchStatsSkeleton key={`skeleton-branch-${index}-${idx}`} />
            ))}
            <WarehouseStatsSkeleton />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
};

export default function BranchStorage() {
  const [branchData, setBranchData] = useState<BranchData[]>([]);
  const [warehouseData, setWarehouseData] = useState<WarehouseData>({
    shoeCount: 0,
    storageFilled: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // Use our socket hook to get real-time updates
  const { changes } = useLineItemUpdates();

  const normalizeBranch = (branch: BranchApi): BranchData => ({
    name: branch.branch_name || branch.name || branch.branch_id,
    branchId: branch.branch_id,
    shoeCount: 0,
    storageFilled: 0,
  });

  const getNormalizedBranchType = async (branch: BranchApi) => {
    const branchType = (branch.type || branch.branch_type || (await getBranchType(branch.branch_id)) || "").trim().toUpperCase();
    return branchType;
  }

  // Function to fetch all storage data
  const fetchStorageData = useCallback(async () => {
    try {
      setLoading(true);

      const branches = (await getBranches()) as BranchApi[];
      const typeBBranches = (await Promise.all(
        branches.map(async (branch) => {
          const branchType = await getNormalizedBranchType(branch);
          return branchType === "B" ? normalizeBranch(branch) : null;
        })
      )).filter((branch): branch is BranchData => branch !== null);

      const branchPromises = typeBBranches.map(async (branch) => {
        const items = await getLineItemsByBranch(branch.branchId);

        const itemsPhysicallyAtBranch = items.filter(item =>
          item.branch_id === branch.branchId &&
          item.current_location === "Branch" &&
          item.current_status !== "Picked Up"
        );

        const shoeCount = itemsPhysicallyAtBranch.length;
        const storageFilled = Math.round((shoeCount / BRANCH_MAX_CAPACITY) * 100);

        return {
          ...branch,
          shoeCount,
          storageFilled: Math.min(100, storageFilled),
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
  }, []);

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
        <div className='branch-info'>
          <h4 className='location-title extra-bold'>{branch.name}</h4>
          <div className='branch-metric-row'>
            <span className='stat-value bold'>{branch.shoeCount}</span>
            <span className='shoe-unit semi-bold'>Shoes</span>
          </div>
        </div>
        <span className="location-icon"><i className="bi bi-shop-window"></i></span>
      </div>
      <div className='storage-row'>
        <span className='stat-label'>Storage Filled</span>
        <span className='storage-percent bold'>{`${branch.storageFilled}%`}</span>
      </div>
      <div className='capacity-bar-container'>
        <div 
          className={`capacity-bar ${branch.storageFilled > 85 ? 'critical' : branch.storageFilled > 70 ? 'warning' : 'normal'}`} 
          style={{ width: `${branch.storageFilled}%` }}
        ></div>
      </div>
    </div>
  );

  const renderWarehouseStats = () => (
    <div className='branch-storage-stats warehouse'>
      <div className='branch-header'>
        <div className='branch-info'>
          <h4 className='location-title extra-bold'>Warehouse (Main)</h4>
          <div className='branch-metric-row'>
            <span className='stat-value bold'>{warehouseData.shoeCount}</span>
            <span className='shoe-unit semi-bold'>Shoes</span>
          </div>
        </div>
        <span className="location-icon warehouse-icon"><i className="bi bi-building-fill"></i></span>
      </div>
      <div className='storage-row'>
        <span className='stat-label'>Storage Filled</span>
        <span className='storage-percent bold'>{`${warehouseData.storageFilled}%`}</span>
      </div>
      <div className='capacity-bar-container'>
        <div 
          className={`capacity-bar ${warehouseData.storageFilled > 85 ? 'critical' : warehouseData.storageFilled > 70 ? 'warning' : 'normal'}`} 
          style={{ width: `${warehouseData.storageFilled}%` }}
        ></div>
      </div>
    </div>
  );

  const createGroups = useCallback((items: BranchData[], groupSize: number) => {
    if (groupSize <= 0) return []

    return Array.from(
      { length: Math.ceil(items.length / groupSize) },
      (_, index) => items.slice(index * groupSize, index * groupSize + groupSize)
    )
  }, [])

  const renderBranchCarousel = useCallback(
    (groupSize: number, keyPrefix: string) => {
      // Show skeleton if loading
      if (loading) {
        return renderSkeletonCarousel(groupSize);
      }

      const groups = createGroups(branchData, groupSize)

      return (
        <Carousel className='carousel'>
          <CarouselContent className='carousel-content'>
            {groups.length > 0
              ? groups.map((group, index) => (
                  <CarouselItem className='carousel-item' key={`${keyPrefix}-branch-group-${index}`}>
                    {group.map(renderBranchStats)}
                    {index === groups.length - 1 && renderWarehouseStats()}
                  </CarouselItem>
                ))
              : (
                <CarouselItem className='carousel-item'>
                  {renderWarehouseStats()}
                </CarouselItem>
              )}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      )
    },
    [branchData, createGroups, loading]
  )

  const desktopCarousel = useMemo(() => renderBranchCarousel(4, 'pc'), [renderBranchCarousel])
  const landscapeCarousel = useMemo(() => renderBranchCarousel(2, 'landscape'), [renderBranchCarousel])
  const mobileCarousel = useMemo(() => renderBranchCarousel(1, 'mobile'), [renderBranchCarousel])

  return (
    <div>
      <div className='pc-tablet'>
        {desktopCarousel}
      </div>

      <div className='landscape-mobile'>
        {landscapeCarousel}
      </div>

      <div className='mobile'>
        {mobileCarousel}
      </div>
    </div>
  );
}
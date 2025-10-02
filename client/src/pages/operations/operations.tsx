import React, { useEffect, useState } from 'react';
import { getBranchType } from '@/utils/api/getBranchType';
import '@/styles/operations/operations.css'
import BranchStorage from '@/components/BranchStorage'
import OperationsNav from '@/components/OperationsNav'
import { Card, CardContent } from '@/components/ui/card'

import OpServiceQueue from '@/pages/operations/operations-sub-tab/OpServiceQueue'
import OpReadyDelivery from '@/pages/operations/operations-sub-tab/OpReadyDelivery'
import OpBranchDelivery from '@/pages/operations/operations-sub-tab/OpBranchDelivery'
import OpWarehouse from '@/pages/operations/operations-sub-tab/OpWarehouse'
import OpReturnBranch from '@/pages/operations/operations-sub-tab/OpReturnBranch'
import OpInStore from '@/pages/operations/operations-sub-tab/OpInStore'
import OpPickup from '@/pages/operations/operations-sub-tab/OpPickup'
import { PickupProvider } from '@/context/PickupContext';

export default function Operations() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAdminUpper, setShowAdminUpper] = useState(true);
  const [fillHeight, setFillHeight] = useState("455px");
  const [branchType, setBranchType] = useState<string | null>(null);

  useEffect(() => {
    // Fetch branch type on mount
    getBranchType().then(type => {
      setBranchType(type);

      // Set showAdminUpper based on type
      if (type === "A") setShowAdminUpper(true);
      else setShowAdminUpper(false);
    });
  }, []);

  const calculateFillHeight = () => {
    let height = "455px";
    const width = window.innerWidth;

    if (showAdminUpper) {
      if (width <= 534) height = "365px";
      else if (width <= 638) height = "385px";
      else if (width <= 898) height = "415px";
      else if (width <= 1088) height = "440px";
    } else {
      if (width <= 534) height = "250px";
      else if (width <= 638) height = "270px";
      else if (width <= 1088) height = "290px";
      else height = "300px";
    }

    setFillHeight(height);
  };

  useEffect(() => {
    calculateFillHeight(); // initial calculation

    const handleResize = () => {
      calculateFillHeight();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize); // cleanup
    };
  }, [showAdminUpper]); // recalc if showAdminUpper changes

  // Tab content filtering logic
  const getTabContent = () => {
    if (branchType === "A") {
      return [
        <OpServiceQueue key={0} />,
        <OpReadyDelivery key={1} />,
        <OpBranchDelivery key={2} />,
        <OpWarehouse key={3} />,
        <OpReturnBranch key={4} />,
        <OpInStore key={5} />,
        <OpPickup key={6} />
      ][activeIndex];
    }
    if (branchType === "B") {
      // Show 0, 1, 4, 5, 6
      const tabs = [
        <OpServiceQueue key={0} />,
        <OpReadyDelivery key={1} readOnly={true} />, // <-- readOnly for B
        null, // 2 hidden
        null, // 3 hidden
        <OpReturnBranch key={4} />,
        <OpInStore key={5} />,
        <OpPickup key={6} />
      ];
      return tabs[activeIndex];
    }
    if (branchType === "W") {
      // For warehouse, only tab 4 is read-only
      const tabs = [
        null, // 0 hidden
        <OpReadyDelivery key={1} />, // NOT readOnly
        <OpBranchDelivery key={2} />,
        <OpWarehouse key={3} />,
        <OpReturnBranch key={4} readOnly={true} />, // <-- readOnly only here
        null,
        null
      ];
      return tabs[activeIndex];
    }
    // Default: show nothing
    return null;
  };

  const getVisibleTabs = () => {
    if (branchType === "A") return [0, 1, 2, 3, 4, 5, 6];
    if (branchType === "B") return [0, 1, 4, 5, 6];
    if (branchType === "W") return [1, 2, 3, 4]; // add 4 later for read-only
    return [];
  };

  return (
    <PickupProvider>
      <div className='main-div' style={{ "--fillheight": fillHeight } as React.CSSProperties}>
        {showAdminUpper && ( // conditional rendering
          <div className='admin-upper'>
            <BranchStorage />
          </div>
        )}

        <div className='main-content'>
          <Card className='rounded-3xl main-card'>
            <CardContent>
              <OperationsNav
                onChange={setActiveIndex}
                visibleTabs={getVisibleTabs()}
              />
              <div className="tab-content">
                {getTabContent()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PickupProvider>
  );
}

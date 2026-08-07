import React from 'react';
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
import { CustomerNamesProvider } from '@/context/CustomerNamesContext';

export default function Operations() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [showAdminUpper, setShowAdminUpper] = React.useState(true);
  const [branchType, setBranchType] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Fetch branch type on mount
    getBranchType().then(type => {
      setBranchType(type);
      // Set showAdminUpper based on type
      if (type === "A") setShowAdminUpper(true);
      else setShowAdminUpper(false);
    });
  }, []);

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
      const tabs = [
        <OpServiceQueue key={0} />,
        <OpReadyDelivery key={1} readOnly={true} />,
        null,
        null,
        <OpReturnBranch key={4} />,
        <OpInStore key={5} />,
        <OpPickup key={6} />
      ];
      return tabs[activeIndex];
    }
    if (branchType === "W") {
      const tabs = [
        null,
        <OpReadyDelivery key={1} />,
        <OpBranchDelivery key={2} />,
        <OpWarehouse key={3} />,
        <OpReturnBranch key={4} readOnly={true} />,
        null,
        null
      ];
      return tabs[activeIndex];
    }
    return null;
  };

  const getVisibleTabs = () => {
    if (branchType === "A") return [0, 1, 2, 3, 4, 5, 6];
    if (branchType === "B") return [0, 1, 4, 5, 6];
    if (branchType === "W") return [1, 2, 3, 4];
    return [];
  };

  return (
    <CustomerNamesProvider>
      <PickupProvider>
        <div className={`main-div ${!showAdminUpper ? 'no-admin' : ''}`}>
          {showAdminUpper && (
            <div className='admin-upper operations-storage'>
              <BranchStorage />
            </div>
          )}

          <div className='main-content operations-content'>
            <Card className='rounded-3xl main-card operations-card'>
              <CardContent className='operations-card-content'>
                <OperationsNav
                  onChange={setActiveIndex}
                  visibleTabs={getVisibleTabs()}
                />
                <div className="tab-content operations-tab-content">
                  {getTabContent()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PickupProvider>
    </CustomerNamesProvider>
  );
}
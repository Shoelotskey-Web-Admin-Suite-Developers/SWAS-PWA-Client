import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCustomerName } from '@/utils/api/getCustomerName';
import { getLineItems } from '@/utils/api/getLineItems';
import { getTransactions } from '@/utils/api/getTransactions';

interface CustomerNamesContextType {
  customerNames: Record<string, string | null>;
  isLoading: boolean;
  getCustomerDisplayName: (customerId: string, showNames: boolean) => string;
}

const CustomerNamesContext = createContext<CustomerNamesContextType | undefined>(undefined);

interface CustomerNamesProviderProps {
  children: ReactNode;
}

export const CustomerNamesProvider: React.FC<CustomerNamesProviderProps> = ({ children }) => {
  const [customerNames, setCustomerNames] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllCustomerNames = async () => {
      try {
        setIsLoading(true);
        
        // Get customer IDs from multiple sources
        const [lineItemsData, transactionsData] = await Promise.all([
          getLineItems("Queued").catch(() => []), // Get from line items
          getTransactions(false).catch(() => [])  // Get from transactions (exclude archived)
        ]);

        // Extract unique customer IDs
        const lineItemCustomerIds = lineItemsData.map((item: any) => item.cust_id);
        const transactionCustomerIds = transactionsData.map((tx: any) => tx.cust_id);
        const allCustomerIds = [...new Set([...lineItemCustomerIds, ...transactionCustomerIds])];

        // Fetch customer names
        const customerNamePromises = allCustomerIds.map(async (custId: string) => {
          try {
            const name = await getCustomerName(custId);
            return { custId, name };
          } catch (error) {
            console.error(`Failed to fetch name for customer ${custId}:`, error);
            return { custId, name: null };
          }
        });

        const customerNameResults = await Promise.all(customerNamePromises);
        
        // Build the customer names object
        const customerNamesMap: Record<string, string | null> = {};
        customerNameResults.forEach(({ custId, name }) => {
          customerNamesMap[custId] = name;
        });

        setCustomerNames(customerNamesMap);
      } catch (error) {
        console.error('Failed to fetch customer names:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllCustomerNames();
  }, []);

  const getCustomerDisplayName = (customerId: string, showNames: boolean) => {
    if (showNames && customerNames[customerId]) {
      return customerNames[customerId] || customerId;
    }
    return customerId;
  };

  const value: CustomerNamesContextType = {
    customerNames,
    isLoading,
    getCustomerDisplayName
  };

  return (
    <CustomerNamesContext.Provider value={value}>
      {children}
    </CustomerNamesContext.Provider>
  );
};

export const useCustomerNames = (): CustomerNamesContextType => {
  const context = useContext(CustomerNamesContext);
  if (context === undefined) {
    throw new Error('useCustomerNames must be used within a CustomerNamesProvider');
  }
  return context;
};
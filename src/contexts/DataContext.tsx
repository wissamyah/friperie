import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { githubDataManager } from "../services/githubDataManager";
import { DataState } from "../services/github/types";

interface DataContextType {
  data: DataState;
  refreshKey: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<DataState>(() => ({
    products: [],
    suppliers: [],
    containers: [],
    supplierLedger: [],
    payments: [],
    sales: [],
    expenses: [],
    cashTransactions: [],
    metadata: undefined,
  }));

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Subscribe to data changes
    const unsubscribeData = githubDataManager.subscribeToData(
      (newData: DataState) => {
        setData({ ...newData });
        setRefreshKey((prev) => prev + 1);
      }
    );

    // Load initial data from GitHub
    const loadInitialData = async () => {
      try {
        // Always load from GitHub on app startup to ensure we have the latest data
        await githubDataManager.loadAllData(false, false);
      } catch (error) {
        console.error("Failed to load initial data:", error);
        // Set default data even on error to prevent app crash
        setData({
          products: [],
          suppliers: [],
          containers: [],
          supplierLedger: [],
          payments: [],
          sales: [],
          expenses: [],
          cashTransactions: [],
          metadata: undefined,
        });
      }
    };

    loadInitialData();

    return () => {
      unsubscribeData();
    };
  }, []);

  return (
    <DataContext.Provider value={{ data, refreshKey }}>
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataContext must be used within DataProvider");
  }
  return context;
};

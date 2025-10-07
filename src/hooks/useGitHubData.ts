import { useState, useEffect, useRef, useCallback } from "react";
import { githubDataManager } from "../services/githubDataManager";
import { DataState } from "../services/github/types";

type DataType = keyof DataState;

interface UseGitHubDataOptions {
  dataType: DataType;
  immediate?: boolean;
}

interface UseGitHubDataReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  updateData: (newData: T[]) => Promise<void>;
  refresh: () => Promise<void>;
  forceSync: () => Promise<void>;
  isOnline: boolean;
}

export function useGitHubData<T = any>({
  dataType,
  immediate = true,
}: UseGitHubDataOptions): UseGitHubDataReturn<T> {
  const [localData, setLocalData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    githubDataManager.getConnectionStatus()
  );

  const unsubscribeDataRef = useRef<(() => void) | null>(null);

  // Subscribe to data changes
  useEffect(() => {
    unsubscribeDataRef.current = githubDataManager.subscribeToData(
      (allData: DataState) => {
        const newData = (allData[dataType] as T[]) || [];
        console.log(`🔔 [${dataType}] Data subscription triggered, items:`, newData.length);
        setLocalData(newData);
        setLoading(false);
      }
    );

    // Initial load
    const loadInitialData = async () => {
      try {
        setLoading(true);

        // Always try to load data if immediate is true to ensure fresh data
        if (immediate) {
          await githubDataManager.loadAllData();
        }

        // Get current data from memory after load
        const currentData = (githubDataManager.getData(dataType) as T[]) || [];
        setLocalData(currentData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      if (unsubscribeDataRef.current) {
        unsubscribeDataRef.current();
      }
    };
  }, [dataType, immediate]);

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      setIsOnline(githubDataManager.getConnectionStatus());
    };

    window.addEventListener("online", checkConnection);
    window.addEventListener("offline", checkConnection);

    return () => {
      window.removeEventListener("online", checkConnection);
      window.removeEventListener("offline", checkConnection);
    };
  }, []);

  const updateData = useCallback(
    async (newData: T[]) => {
      try {
        await githubDataManager.updateData(dataType, newData);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [dataType]
  );

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      await githubDataManager.loadAllData(false, true);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const forceSync = useCallback(async () => {
    try {
      await githubDataManager.forceSync();
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  return {
    data: localData,
    loading,
    error,
    updateData,
    refresh,
    forceSync,
    isOnline,
  };
}

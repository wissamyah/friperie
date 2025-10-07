import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { githubDataManager } from "../services/githubDataManager";
import { SaveStatus } from "../services/github/types";

interface SaveStatusContextType {
  status: SaveStatus;
  error: string | null;
  lastSaved: string | null;
  hasPendingSaves: boolean;
}

const SaveStatusContext = createContext<SaveStatusContextType | undefined>(
  undefined
);

export const SaveStatusProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasPendingSaves, setHasPendingSaves] = useState(false);

  useEffect(() => {
    // Subscribe to save status changes
    const unsubscribe = githubDataManager.subscribeToSaveStatus(
      (newStatus, newError) => {
        setStatus(newStatus);
        setError(newError || null);

        if (newStatus === "saved") {
          setLastSaved(new Date().toISOString());
        }
      }
    );

    // Check for pending saves periodically
    const interval = setInterval(() => {
      setHasPendingSaves(githubDataManager.hasPendingSaves());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <SaveStatusContext.Provider
      value={{ status, error, lastSaved, hasPendingSaves }}
    >
      {children}
    </SaveStatusContext.Provider>
  );
};

export const useSaveStatusContext = () => {
  const context = useContext(SaveStatusContext);
  if (!context) {
    throw new Error(
      "useSaveStatusContext must be used within SaveStatusProvider"
    );
  }
  return context;
};

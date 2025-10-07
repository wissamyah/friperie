import { useState, useEffect } from "react";
import { DataProvider } from "./contexts/DataContext";
import { SaveStatusProvider } from "./contexts/SaveStatusContext";
import { DataErrorBoundary } from "./components/DataErrorBoundary";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SaveStatusIndicator } from "./components/SaveStatusIndicator";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import LoadingScreen from "./components/LoadingScreen";
import { githubDataManager } from "./services/githubDataManager";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  // Prevent data loss on refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (githubDataManager.hasPendingSaves()) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("github_token");

      if (token) {
        githubDataManager.updateToken(token);
        setIsAuthenticated(true);
        await githubDataManager.loadAllData();
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = async (token: string) => {
    try {
      localStorage.setItem("github_token", token);
      githubDataManager.updateToken(token);
      setIsAuthenticated(true);
      await githubDataManager.loadAllData();
    } catch (error) {
      console.error("Authentication failed:", error);
      alert("Failed to authenticate. Please check your token and try again.");
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LandingPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <ErrorBoundary>
      <SaveStatusProvider>
        <DataProvider>
          <DataErrorBoundary>
            <Dashboard />
            {/* SaveStatusIndicator removed - all forms have button-level loading states */}
          </DataErrorBoundary>
        </DataProvider>
      </SaveStatusProvider>
    </ErrorBoundary>
  );
}

export default App;

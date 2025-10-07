import React, { ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

interface Props {
  children: ReactNode;
}

export const DataErrorBoundary: React.FC<Props> = ({ children }) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error("Data operation error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  };

  const fallback = (
    <div
      style={{
        padding: "24px",
        margin: "20px",
        border: "2px solid #ff9800",
        borderRadius: "8px",
        backgroundColor: "#fff8e1",
      }}
    >
      <h3 style={{ color: "#e65100", marginTop: 0 }}>
        ⚠️ Data Operation Failed
      </h3>
      <p style={{ color: "#666", marginBottom: "16px" }}>
        We encountered an issue while processing your data. This could be due
        to:
      </p>
      <ul style={{ color: "#666", marginBottom: "16px" }}>
        <li>Network connectivity issues</li>
        <li>GitHub API rate limits</li>
        <li>Invalid authentication token</li>
        <li>Data synchronization conflicts</li>
      </ul>
      <p style={{ color: "#666", marginBottom: "16px" }}>
        Your changes may not have been saved. Please try refreshing the page.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: "10px 20px",
          backgroundColor: "#ff9800",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Refresh Page
      </button>
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};

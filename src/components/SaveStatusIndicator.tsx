import React from "react";
import { useSaveStatusContext } from "../contexts/SaveStatusContext";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export const SaveStatusIndicator: React.FC = () => {
  const { status, error, lastSaved } = useSaveStatusContext();

  const getStatusConfig = () => {
    switch (status) {
      case "saving":
        return {
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          textColor: "text-blue-400",
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: "Saving...",
        };
      case "saved":
        return {
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          textColor: "text-green-400",
          icon: <CheckCircle2 className="w-4 h-4" />,
          text: "All changes saved",
        };
      case "error":
        return {
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          textColor: "text-red-400",
          icon: <AlertCircle className="w-4 h-4" />,
          text: `Save failed: ${error || "Unknown error"}`,
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();

  if (!config) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 ${config.bgColor} ${config.borderColor} ${config.textColor} border px-5 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-medium z-[9999] backdrop-blur-sm animate-in slide-in-from-bottom-2 fade-in duration-200`}
    >
      {config.icon}
      <span>{config.text}</span>
      {lastSaved && status === "saved" && (
        <span className="text-xs opacity-70">
          ({new Date(lastSaved).toLocaleTimeString()})
        </span>
      )}
    </div>
  );
};

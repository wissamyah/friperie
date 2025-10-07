import { useCallback, useState } from "react";
import { useGitHubData } from "./useGitHubData";
import { Supplier } from "../services/github/types";

export const useSuppliers = () => {
  const {
    data: suppliers,
    loading,
    error,
    updateData: updateSuppliers,
    isOnline,
    refresh,
    forceSync,
  } = useGitHubData<Supplier>({
    dataType: "suppliers",
    immediate: true,
  });

  // Action loading states
  const [actionLoading, setActionLoading] = useState<{
    action: string;
    id?: string;
  } | null>(null);

  // Helper: Generate unique ID
  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Helper: Check if specific action is loading
  const isActionLoading = (action: string, id?: string) => {
    if (!actionLoading) return false;
    return (
      actionLoading.action === action &&
      (id === undefined || actionLoading.id === id)
    );
  };

  // CREATE operation
  const createSupplier = useCallback(
    async (name: string) => {
      setActionLoading({ action: "create" });

      try {
        const newSupplier: Supplier = {
          id: generateId(),
          name,
          balance: 0, // Initialize balance to 0
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await updateSuppliers([...suppliers, newSupplier]);
        return { success: true, data: newSupplier };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [suppliers, updateSuppliers]
  );

  // READ operation (suppliers are already available via useGitHubData)
  const getSupplierById = useCallback(
    (id: string) => {
      return suppliers.find((supplier) => supplier.id === id);
    },
    [suppliers]
  );

  // UPDATE operation
  const updateSupplier = useCallback(
    async (id: string, updates: Partial<Supplier>) => {
      setActionLoading({ action: "update", id });

      try {
        const updatedSuppliers = suppliers.map((supplier) =>
          supplier.id === id
            ? { ...supplier, ...updates, updatedAt: new Date().toISOString() }
            : supplier
        );

        await updateSuppliers(updatedSuppliers);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [suppliers, updateSuppliers]
  );

  // DELETE operation
  const deleteSupplier = useCallback(
    async (id: string) => {
      setActionLoading({ action: "delete", id });

      try {
        const filteredSuppliers = suppliers.filter((supplier) => supplier.id !== id);
        await updateSuppliers(filteredSuppliers);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [suppliers, updateSuppliers]
  );

  // UPDATE balance operation
  const updateBalance = useCallback(
    async (id: string, newBalance: number) => {
      setActionLoading({ action: "updateBalance", id });

      try {
        const updatedSuppliers = suppliers.map((supplier) =>
          supplier.id === id
            ? { ...supplier, balance: newBalance, updatedAt: new Date().toISOString() }
            : supplier
        );

        await updateSuppliers(updatedSuppliers);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [suppliers, updateSuppliers]
  );

  return {
    // Data
    suppliers,
    loading,
    error,
    isOnline,

    // Action loading states
    actionLoading,
    isActionLoading,

    // Operations
    createSupplier,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    updateBalance,

    // Utilities
    refresh,
    forceSync,
  };
};

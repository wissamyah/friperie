import { useCallback, useState } from "react";
import { useGitHubData } from "./useGitHubData";
import { SupplierLedgerEntry, LedgerEntryType } from "../services/github/types";

export const useSupplierLedger = () => {
  const {
    data: ledgerEntriesData,
    loading,
    error,
    updateData: updateLedgerEntries,
    isOnline,
    refresh,
    forceSync,
  } = useGitHubData<SupplierLedgerEntry>({
    dataType: "supplierLedger",
    immediate: true,
  });

  // Ensure ledgerEntries is always an array
  const ledgerEntries = ledgerEntriesData || [];

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

  // Get ledger entries for a specific supplier (sorted by date, newest first)
  const getLedgerEntriesBySupplierId = useCallback(
    (supplierId: string) => {
      return ledgerEntries
        .filter((entry) => entry.supplierId === supplierId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    [ledgerEntries]
  );

  // Calculate current running balance for a supplier
  const calculateRunningBalance = useCallback(
    (supplierId: string): number => {
      const supplierEntries = ledgerEntries.filter(e => e.supplierId === supplierId);
      if (supplierEntries.length === 0) return 0;

      // Sort chronologically (oldest first) by date, then by createdAt
      const chronologicalEntries = supplierEntries.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA === dateB) {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return dateA - dateB;
      });

      // Calculate running balance chronologically
      let runningBalance = 0;
      chronologicalEntries.forEach(entry => {
        runningBalance += entry.amount;
      });

      return runningBalance;
    },
    [ledgerEntries]
  );

  // CREATE ledger entry
  const createLedgerEntry = useCallback(
    async (
      supplierId: string,
      supplierName: string,
      type: LedgerEntryType,
      amount: number, // Negative for debits (containers), positive for credits (payments)
      description: string,
      date: string,
      relatedContainerId?: string
    ) => {
      setActionLoading({ action: "create" });

      try {
        // Create the new entry without balance (will be calculated below)
        const newEntry: SupplierLedgerEntry = {
          id: generateId(),
          supplierId,
          supplierName,
          type,
          amount,
          balance: 0, // Temporary, will be recalculated
          description,
          relatedContainerId,
          date,
          createdAt: new Date().toISOString(),
        };

        // Add new entry to the list
        const allEntries = [...ledgerEntries, newEntry];

        // Get all entries for this supplier
        const supplierEntries = allEntries.filter(e => e.supplierId === supplierId);

        // Sort chronologically (oldest first) by date, then by createdAt
        const chronologicalEntries = supplierEntries.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA === dateB) {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }
          return dateA - dateB;
        });

        // Recalculate running balances chronologically
        let runningBalance = 0;
        const updatedSupplierEntries = chronologicalEntries.map(entry => {
          runningBalance += entry.amount;
          return {
            ...entry,
            balance: runningBalance
          };
        });

        // Create final list with updated balances for this supplier
        const otherSupplierEntries = allEntries.filter(e => e.supplierId !== supplierId);
        const finalEntries = [...otherSupplierEntries, ...updatedSupplierEntries];

        // Get the final balance for the new entry
        const updatedNewEntry = updatedSupplierEntries.find(e => e.id === newEntry.id);
        const newBalance = updatedNewEntry ? updatedNewEntry.balance : runningBalance;

        await updateLedgerEntries(finalEntries);
        return { success: true, data: updatedNewEntry || newEntry, newBalance };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [ledgerEntries, updateLedgerEntries]
  );

  // CREATE container entry (helper for container creation)
  const createContainerEntry = useCallback(
    async (
      supplierId: string,
      supplierName: string,
      containerNumber: string,
      amount: number,
      date: string,
      containerId: string
    ) => {
      return createLedgerEntry(
        supplierId,
        supplierName,
        "container",
        -Math.abs(amount), // Ensure negative (debit)
        `Container ${containerNumber} purchase`,
        date,
        containerId
      );
    },
    [createLedgerEntry]
  );

  // CREATE payment entry (helper for payment recording)
  const createPaymentEntry = useCallback(
    async (
      supplierId: string,
      supplierName: string,
      amount: number,
      description: string,
      date: string
    ) => {
      return createLedgerEntry(
        supplierId,
        supplierName,
        "payment",
        Math.abs(amount), // Ensure positive (credit)
        description,
        date
      );
    },
    [createLedgerEntry]
  );

  // DELETE ledger entry
  const deleteLedgerEntry = useCallback(
    async (id: string) => {
      setActionLoading({ action: "delete", id });

      try {
        const filteredEntries = ledgerEntries.filter((entry) => entry.id !== id);
        await updateLedgerEntries(filteredEntries);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [ledgerEntries, updateLedgerEntries]
  );

  // Get all unique suppliers from ledger
  const getUniqueSuppliersFromLedger = useCallback(() => {
    const supplierMap = new Map<string, string>();
    ledgerEntries.forEach((entry) => {
      if (!supplierMap.has(entry.supplierId)) {
        supplierMap.set(entry.supplierId, entry.supplierName);
      }
    });
    return Array.from(supplierMap.entries()).map(([id, name]) => ({ id, name }));
  }, [ledgerEntries]);

  // Recalculate and fix all balances in the database
  const recalculateAllBalances = useCallback(async () => {
    try {
      // Get all unique supplier IDs
      const supplierIds = [...new Set(ledgerEntries.map(e => e.supplierId))];

      // Recalculate balances for each supplier
      const updatedEntries: SupplierLedgerEntry[] = [];

      supplierIds.forEach(supplierId => {
        const supplierEntries = ledgerEntries.filter(e => e.supplierId === supplierId);

        // Sort chronologically (oldest first) by date, then by createdAt
        const chronological = supplierEntries.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA === dateB) {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }
          return dateA - dateB;
        });

        // Recalculate running balances
        let runningBalance = 0;
        chronological.forEach(entry => {
          runningBalance += entry.amount;
          updatedEntries.push({
            ...entry,
            balance: runningBalance
          });
        });
      });

      // Update all entries with correct balances
      await updateLedgerEntries(updatedEntries);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [ledgerEntries, updateLedgerEntries]);

  return {
    // Data
    ledgerEntries,
    loading,
    error,
    isOnline,

    // Action loading states
    actionLoading,
    isActionLoading,

    // Query operations
    getLedgerEntriesBySupplierId,
    calculateRunningBalance,
    getUniqueSuppliersFromLedger,

    // Create operations
    createLedgerEntry,
    createContainerEntry,
    createPaymentEntry,

    // Delete operation
    deleteLedgerEntry,

    // Fix operations
    recalculateAllBalances,

    // Utilities
    refresh,
    forceSync,
  };
};

import { useState, useEffect, useCallback } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { Partner, PartnerTransaction, CashTransaction } from '../services/github/types';
import { githubDataManager } from '../services/githubDataManager';

interface ActionLoading {
  type: 'create' | 'update' | 'delete' | 'transaction';
  id?: string;
}

export function usePartners() {
  const { data, refreshKey } = useDataContext();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerTransactions, setPartnerTransactions] = useState<PartnerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<ActionLoading | null>(null);

  useEffect(() => {
    // Sort partners by name
    const sortedPartners = [...(data.partners || [])].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setPartners(sortedPartners);

    // Sort transactions by date (newest first), then by createdAt
    const sortedTransactions = [...(data.partnerTransactions || [])].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA === dateB) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return dateB - dateA;
    });
    setPartnerTransactions(sortedTransactions);

    setLoading(false);
  }, [data.partners, data.partnerTransactions, refreshKey]);

  const isActionLoading = (type: 'create' | 'update' | 'delete' | 'transaction', id?: string) => {
    if (!actionLoading) return false;
    if (actionLoading.type !== type) return false;
    if (id && actionLoading.id !== id) return false;
    return true;
  };

  // Calculate balance for a new cash transaction
  const calculateCashBalance = useCallback((amount: number, existingTransactions: CashTransaction[]): number => {
    return existingTransactions.reduce((sum, t) => sum + t.amount, 0) + amount;
  }, []);

  // Recalculate all cash transaction balances chronologically
  const recalculateAllCashBalances = useCallback((transactions: CashTransaction[]): CashTransaction[] => {
    // Sort chronologically (oldest first) by date, then by createdAt
    const chronological = [...transactions].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA === dateB) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return dateA - dateB;
    });

    // Recalculate running balances
    let runningBalance = 0;
    return chronological.map(transaction => {
      runningBalance += transaction.amount;
      return {
        ...transaction,
        balance: runningBalance
      };
    });
  }, []);

  // Create a new partner
  const createPartner = useCallback(
    async (name: string) => {
      setActionLoading({ type: 'create' });
      setError(null);

      try {
        const currentPartners = githubDataManager.getData('partners') || [];

        // Check if partner name already exists
        if (currentPartners.some(p => p.name.toLowerCase() === name.toLowerCase())) {
          throw new Error('Partner with this name already exists');
        }

        const timestamp = new Date().toISOString();

        const newPartner: Partner = {
          id: `partner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name,
          balance: 0, // Start with zero balance
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        await githubDataManager.updateData('partners', [...currentPartners, newPartner]);

        return { success: true, data: newPartner };
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to create partner';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  // Update partner details
  const updatePartner = useCallback(
    async (partnerId: string, name: string) => {
      setActionLoading({ type: 'update', id: partnerId });
      setError(null);

      try {
        const currentPartners = githubDataManager.getData('partners') || [];
        const currentTransactions = githubDataManager.getData('partnerTransactions') || [];

        const partner = currentPartners.find(p => p.id === partnerId);
        if (!partner) {
          throw new Error('Partner not found');
        }

        // Check if new name conflicts with another partner
        if (currentPartners.some(p => p.id !== partnerId && p.name.toLowerCase() === name.toLowerCase())) {
          throw new Error('Partner with this name already exists');
        }

        const timestamp = new Date().toISOString();

        // Update partner
        const updatedPartner: Partner = {
          ...partner,
          name,
          updatedAt: timestamp,
        };

        // Update partner name in all their transactions for historical reference
        const updatedTransactions = currentTransactions.map(t =>
          t.partnerId === partnerId ? { ...t, partnerName: name, updatedAt: timestamp } : t
        );

        // Batch update
        githubDataManager.startBatchUpdate();
        await githubDataManager.updateData('partners',
          currentPartners.map(p => p.id === partnerId ? updatedPartner : p)
        );
        await githubDataManager.updateData('partnerTransactions', updatedTransactions);
        await githubDataManager.endBatchUpdate();

        return { success: true, data: updatedPartner };
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to update partner';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  // Delete partner (only if they have no transactions)
  const deletePartner = useCallback(
    async (partnerId: string) => {
      setActionLoading({ type: 'delete', id: partnerId });
      setError(null);

      try {
        const currentPartners = githubDataManager.getData('partners') || [];
        const currentTransactions = githubDataManager.getData('partnerTransactions') || [];

        const partner = currentPartners.find(p => p.id === partnerId);
        if (!partner) {
          throw new Error('Partner not found');
        }

        // Check if partner has transactions
        const hasTransactions = currentTransactions.some(t => t.partnerId === partnerId);
        if (hasTransactions) {
          throw new Error('Cannot delete partner with existing transactions. Delete all transactions first.');
        }

        await githubDataManager.updateData('partners',
          currentPartners.filter(p => p.id !== partnerId)
        );

        return { success: true };
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to delete partner';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  // Create partner transaction (injection or withdrawal)
  const createPartnerTransaction = useCallback(
    async (
      partnerId: string,
      type: 'injection' | 'withdrawal',
      amountUSD: number,
      date: string,
      description: string
    ) => {
      setActionLoading({ type: 'transaction' });
      setError(null);

      try {
        const currentPartners = githubDataManager.getData('partners') || [];
        const currentTransactions = githubDataManager.getData('partnerTransactions') || [];
        const currentCashTransactions = githubDataManager.getData('cashTransactions') || [];

        const partner = currentPartners.find(p => p.id === partnerId);
        if (!partner) {
          throw new Error('Partner not found');
        }

        const timestamp = new Date().toISOString();

        // Determine cash transaction type and amount sign
        const cashType: 'partner_injection' | 'partner_withdrawal' =
          type === 'injection' ? 'partner_injection' : 'partner_withdrawal';
        const cashAmount = type === 'injection' ? amountUSD : -amountUSD;
        const partnerBalanceChange = type === 'injection' ? amountUSD : -amountUSD;

        // Create partner transaction
        const newTransaction: PartnerTransaction = {
          id: `partner-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          partnerId,
          partnerName: partner.name,
          date,
          type,
          amountUSD,
          description,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        // Create cash transaction
        const newCashTransaction: CashTransaction = {
          id: `cash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date,
          type: cashType,
          amount: cashAmount,
          balance: calculateCashBalance(cashAmount, currentCashTransactions),
          description: `${partner.name} - ${type}: ${description}`,
          relatedPartnerTransactionId: newTransaction.id,
          createdAt: timestamp,
        };

        // Link cash transaction to partner transaction
        newTransaction.relatedCashTransactionId = newCashTransaction.id;

        // Update partner balance
        const updatedPartner: Partner = {
          ...partner,
          balance: partner.balance + partnerBalanceChange,
          updatedAt: timestamp,
        };

        // Batch update
        githubDataManager.startBatchUpdate();
        await githubDataManager.updateData('partners',
          currentPartners.map(p => p.id === partnerId ? updatedPartner : p)
        );
        await githubDataManager.updateData('partnerTransactions',
          [...currentTransactions, newTransaction]
        );
        await githubDataManager.updateData('cashTransactions',
          [...currentCashTransactions, newCashTransaction]
        );
        await githubDataManager.endBatchUpdate();

        return { success: true, data: newTransaction };
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to create partner transaction';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setActionLoading(null);
      }
    },
    [calculateCashBalance]
  );

  // Update partner transaction
  const updatePartnerTransaction = useCallback(
    async (
      transactionId: string,
      type: 'injection' | 'withdrawal',
      amountUSD: number,
      date: string,
      description: string
    ) => {
      setActionLoading({ type: 'transaction', id: transactionId });
      setError(null);

      try {
        const currentPartners = githubDataManager.getData('partners') || [];
        const currentTransactions = githubDataManager.getData('partnerTransactions') || [];
        const currentCashTransactions = githubDataManager.getData('cashTransactions') || [];

        const transaction = currentTransactions.find(t => t.id === transactionId);
        if (!transaction) {
          throw new Error('Transaction not found');
        }

        const partner = currentPartners.find(p => p.id === transaction.partnerId);
        if (!partner) {
          throw new Error('Partner not found');
        }

        const relatedCashTx = currentCashTransactions.find(
          ct => ct.relatedPartnerTransactionId === transactionId
        );

        const timestamp = new Date().toISOString();

        // Calculate balance adjustments
        const oldBalanceChange = transaction.type === 'injection'
          ? transaction.amountUSD : -transaction.amountUSD;
        const newBalanceChange = type === 'injection' ? amountUSD : -amountUSD;
        const balanceDifference = newBalanceChange - oldBalanceChange;

        // Update partner transaction
        const updatedTransaction: PartnerTransaction = {
          ...transaction,
          type,
          amountUSD,
          date,
          description,
          updatedAt: timestamp,
        };

        // Update cash transaction
        const cashType: 'partner_injection' | 'partner_withdrawal' =
          type === 'injection' ? 'partner_injection' : 'partner_withdrawal';
        const cashAmount = type === 'injection' ? amountUSD : -amountUSD;

        let updatedCashTransactions = currentCashTransactions;
        if (relatedCashTx) {
          const updatedCashTx: CashTransaction = {
            ...relatedCashTx,
            date,
            type: cashType,
            amount: cashAmount,
            balance: 0, // Will be recalculated
            description: `${partner.name} - ${type}: ${description}`,
          };

          updatedCashTransactions = currentCashTransactions.map(ct =>
            ct.id === relatedCashTx.id ? updatedCashTx : ct
          );
        }

        // Recalculate all cash balances
        const recalculatedCashTransactions = recalculateAllCashBalances(updatedCashTransactions);

        // Update partner balance
        const updatedPartner: Partner = {
          ...partner,
          balance: partner.balance + balanceDifference,
          updatedAt: timestamp,
        };

        // Batch update
        githubDataManager.startBatchUpdate();
        await githubDataManager.updateData('partners',
          currentPartners.map(p => p.id === partner.id ? updatedPartner : p)
        );
        await githubDataManager.updateData('partnerTransactions',
          currentTransactions.map(t => t.id === transactionId ? updatedTransaction : t)
        );
        await githubDataManager.updateData('cashTransactions', recalculatedCashTransactions);
        await githubDataManager.endBatchUpdate();

        return { success: true, data: updatedTransaction };
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to update partner transaction';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setActionLoading(null);
      }
    },
    [recalculateAllCashBalances]
  );

  // Delete partner transaction
  const deletePartnerTransaction = useCallback(
    async (transactionId: string) => {
      setActionLoading({ type: 'transaction', id: transactionId });
      setError(null);

      try {
        const currentPartners = githubDataManager.getData('partners') || [];
        const currentTransactions = githubDataManager.getData('partnerTransactions') || [];
        const currentCashTransactions = githubDataManager.getData('cashTransactions') || [];

        const transaction = currentTransactions.find(t => t.id === transactionId);
        if (!transaction) {
          throw new Error('Transaction not found');
        }

        const partner = currentPartners.find(p => p.id === transaction.partnerId);
        if (!partner) {
          throw new Error('Partner not found');
        }

        const timestamp = new Date().toISOString();

        // Calculate balance adjustment (reverse the transaction)
        const balanceChange = transaction.type === 'injection'
          ? -transaction.amountUSD : transaction.amountUSD;

        // Update partner balance
        const updatedPartner: Partner = {
          ...partner,
          balance: partner.balance + balanceChange,
          updatedAt: timestamp,
        };

        // Remove related cash transaction
        const updatedCashTransactions = currentCashTransactions.filter(
          ct => ct.relatedPartnerTransactionId !== transactionId
        );

        // Recalculate all cash balances
        const recalculatedCashTransactions = recalculateAllCashBalances(updatedCashTransactions);

        // Batch update
        githubDataManager.startBatchUpdate();
        await githubDataManager.updateData('partners',
          currentPartners.map(p => p.id === partner.id ? updatedPartner : p)
        );
        await githubDataManager.updateData('partnerTransactions',
          currentTransactions.filter(t => t.id !== transactionId)
        );
        await githubDataManager.updateData('cashTransactions', recalculatedCashTransactions);
        await githubDataManager.endBatchUpdate();

        return { success: true };
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to delete partner transaction';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setActionLoading(null);
      }
    },
    [recalculateAllCashBalances]
  );

  // Get transactions for a specific partner
  const getPartnerTransactions = useCallback(
    (partnerId: string) => {
      return partnerTransactions.filter(t => t.partnerId === partnerId);
    },
    [partnerTransactions]
  );

  // Get partner by ID
  const getPartnerById = useCallback(
    (partnerId: string) => {
      return partners.find(p => p.id === partnerId);
    },
    [partners]
  );

  return {
    partners,
    partnerTransactions,
    loading,
    error,
    createPartner,
    updatePartner,
    deletePartner,
    createPartnerTransaction,
    updatePartnerTransaction,
    deletePartnerTransaction,
    getPartnerTransactions,
    getPartnerById,
    isActionLoading,
  };
}

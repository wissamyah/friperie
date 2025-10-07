import { useState, useEffect, useCallback } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { Expense, CashTransaction } from '../services/github/types';
import { githubDataManager } from '../services/githubDataManager';

interface ActionLoading {
  type: 'create' | 'update' | 'delete';
  id?: string;
}

export function useExpenses() {
  const { data, refreshKey } = useDataContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<ActionLoading | null>(null);

  useEffect(() => {
    setExpenses(data.expenses || []);
    setLoading(false);
  }, [data.expenses, refreshKey]);

  const isActionLoading = (type: 'create' | 'update' | 'delete', id?: string) => {
    if (!actionLoading) return false;
    if (actionLoading.type !== type) return false;
    if (id && actionLoading.id !== id) return false;
    return true;
  };

  // Calculate balance for a new transaction by summing all existing transactions + new amount
  const calculateBalance = useCallback((amount: number, existingTransactions: CashTransaction[]): number => {
    return existingTransactions.reduce((sum, t) => sum + t.amount, 0) + amount;
  }, []);

  // Calculate balance for an updated transaction based on chronological position
  const calculateBalanceForUpdate = useCallback((
    amount: number,
    date: string,
    createdAt: string,
    currentId: string,
    allTransactions: CashTransaction[]
  ): number => {
    const transactionsBeforeThis = allTransactions.filter(t => {
      if (t.id === currentId) return false;
      const newDateTime = new Date(date).getTime();
      const tDateTime = new Date(t.date).getTime();
      if (tDateTime < newDateTime) return true;
      if (tDateTime === newDateTime) {
        return new Date(t.createdAt).getTime() < new Date(createdAt).getTime();
      }
      return false;
    });

    return transactionsBeforeThis.reduce((sum, t) => sum + t.amount, 0) + amount;
  }, []);

  const createExpense = useCallback(
    async (date: string, category: string, amountUSD: number, description: string) => {
      setActionLoading({ type: 'create' });
      setError(null);

      try {
        // Get fresh data from GitHub to avoid stale state
        const currentExpenses = githubDataManager.getData('expenses') || [];
        const currentCashTransactions = githubDataManager.getData('cashTransactions') || [];

        const timestamp = new Date().toISOString();

        // Create expense record
        const newExpense: Expense = {
          id: `expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date,
          category,
          amountUSD,
          description,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        // Create cash transaction (negative amount for expense)
        const newCashTransaction: CashTransaction = {
          id: `cash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date,
          type: 'expense',
          amount: -amountUSD,
          balance: calculateBalance(-amountUSD, currentCashTransactions),
          description: `${category}: ${description}`,
          relatedExpenseId: newExpense.id,
          createdAt: timestamp,
        };

        // Batch update to GitHub
        githubDataManager.startBatchUpdate();
        await githubDataManager.updateData('expenses', [...currentExpenses, newExpense]);
        await githubDataManager.updateData('cashTransactions', [...currentCashTransactions, newCashTransaction]);
        await githubDataManager.endBatchUpdate();

        return { success: true, data: newExpense };
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to create expense';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setActionLoading(null);
      }
    },
    [calculateBalance]
  );

  const updateExpense = useCallback(
    async (
      expenseId: string,
      date: string,
      category: string,
      amountUSD: number,
      description: string
    ) => {
      setActionLoading({ type: 'update', id: expenseId });
      setError(null);

      try {
        // Get fresh data from GitHub to avoid stale state
        const currentExpenses = githubDataManager.getData('expenses') || [];
        const currentCashTransactions = githubDataManager.getData('cashTransactions') || [];

        const expense = currentExpenses.find((e) => e.id === expenseId);
        if (!expense) {
          throw new Error('Expense not found');
        }

        const relatedTransaction = currentCashTransactions.find((t) => t.relatedExpenseId === expenseId);
        if (!relatedTransaction) {
          throw new Error('Related cash transaction not found');
        }

        const timestamp = new Date().toISOString();

        // Update expense record
        const updatedExpense: Expense = {
          ...expense,
          date,
          category,
          amountUSD,
          description,
          updatedAt: timestamp,
        };

        // Update cash transaction with recalculated balance
        const updatedCashTransaction: CashTransaction = {
          ...relatedTransaction,
          date,
          amount: -amountUSD,
          balance: calculateBalanceForUpdate(
            -amountUSD,
            date,
            relatedTransaction.createdAt,
            relatedTransaction.id,
            currentCashTransactions
          ),
          description: `${category}: ${description}`,
        };

        // Batch update to GitHub
        githubDataManager.startBatchUpdate();
        await githubDataManager.updateData('expenses',
          currentExpenses.map((e) => e.id === expenseId ? updatedExpense : e)
        );
        await githubDataManager.updateData('cashTransactions',
          currentCashTransactions.map((t) => t.id === relatedTransaction.id ? updatedCashTransaction : t)
        );
        await githubDataManager.endBatchUpdate();

        return { success: true, data: updatedExpense };
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to update expense';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setActionLoading(null);
      }
    },
    [calculateBalanceForUpdate]
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      setActionLoading({ type: 'delete', id: expenseId });
      setError(null);

      try {
        // Get fresh data from GitHub to avoid stale state
        const currentExpenses = githubDataManager.getData('expenses') || [];
        const currentCashTransactions = githubDataManager.getData('cashTransactions') || [];

        const expense = currentExpenses.find((e) => e.id === expenseId);
        if (!expense) {
          throw new Error('Expense not found');
        }

        const relatedTransaction = currentCashTransactions.find((t) => t.relatedExpenseId === expenseId);

        // Batch update to GitHub
        githubDataManager.startBatchUpdate();
        await githubDataManager.updateData('expenses', currentExpenses.filter((e) => e.id !== expenseId));
        if (relatedTransaction) {
          await githubDataManager.updateData('cashTransactions',
            currentCashTransactions.filter((t) => t.id !== relatedTransaction.id)
          );
        }
        await githubDataManager.endBatchUpdate();

        return { success: true };
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to delete expense';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  return {
    expenses,
    loading,
    error,
    createExpense,
    updateExpense,
    deleteExpense,
    isActionLoading,
  };
}

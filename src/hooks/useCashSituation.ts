import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { CashTransaction, Sale, Expense } from '../services/github/types';

export function useCashSituation() {
  const { data, refreshKey } = useDataContext();
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCashTransactions(data.cashTransactions || []);
    setSales(data.sales || []);
    setExpenses(data.expenses || []);
    setLoading(false);
  }, [data.cashTransactions, data.sales, data.expenses, refreshKey]);

  // Sort transactions chronologically and calculate running balances, then sort for display (newest first)
  const getDisplayTransactions = useMemo(() => {
    if (cashTransactions.length === 0) return [];

    // Sort chronologically for balance calculation
    const chronological = [...cashTransactions].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA === dateB) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return dateA - dateB;
    });

    // Calculate running balances
    let runningBalance = 0;
    const transactionsWithBalance = chronological.map((transaction) => {
      runningBalance += transaction.amount;
      return { ...transaction, balance: runningBalance };
    });

    // Sort by createdAt descending for display (newest first)
    return transactionsWithBalance.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [cashTransactions]);

  // Calculate current balance: sum of all sales - sum of all expenses
  const getCurrentBalance = useMemo(() => {
    return cashTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [cashTransactions]);

  // Calculate total income from sales
  const getTotalIncome = useMemo(() => {
    return cashTransactions
      .filter((t) => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [cashTransactions]);

  // Calculate total expenses
  const getTotalExpenses = useMemo(() => {
    return Math.abs(
      cashTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
    );
  }, [cashTransactions]);

  // Get transaction count
  const getTransactionCount = useMemo(() => {
    return cashTransactions.length;
  }, [cashTransactions]);

  // Get transactions by date range
  const getTransactionsByDateRange = useCallback(
    (startDate: string, endDate: string) => {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();

      return getDisplayTransactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date).getTime();
        return transactionDate >= start && transactionDate <= end;
      });
    },
    [getDisplayTransactions]
  );

  // Get transactions by type
  const getTransactionsByType = useCallback(
    (type: 'sale' | 'expense') => {
      return getDisplayTransactions.filter((transaction) => transaction.type === type);
    },
    [getDisplayTransactions]
  );

  // Get income/expense statistics by month
  const getMonthlyStats = useMemo(() => {
    const stats: Record<string, { income: number; expenses: number; balance: number }> = {};

    cashTransactions.forEach((transaction) => {
      const monthKey = transaction.date.substring(0, 7); // YYYY-MM

      if (!stats[monthKey]) {
        stats[monthKey] = { income: 0, expenses: 0, balance: 0 };
      }

      if (transaction.type === 'sale') {
        stats[monthKey].income += transaction.amount;
      } else {
        stats[monthKey].expenses += Math.abs(transaction.amount);
      }

      stats[monthKey].balance = stats[monthKey].income - stats[monthKey].expenses;
    });

    return stats;
  }, [cashTransactions]);

  return {
    cashTransactions: getDisplayTransactions,
    sales,
    expenses,
    loading,
    error,
    currentBalance: getCurrentBalance,
    totalIncome: getTotalIncome,
    totalExpenses: getTotalExpenses,
    transactionCount: getTransactionCount,
    getTransactionsByDateRange,
    getTransactionsByType,
    monthlyStats: getMonthlyStats,
  };
}

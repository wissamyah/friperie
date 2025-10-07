import { useMemo } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { Sale, Expense, CashTransaction, Product, Container } from '../services/github/types';

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

export interface ReportMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  transactionCount: number;
  averageTransaction: number;
}

export interface DailyMetrics extends ReportMetrics {
  date: string;
}

export interface TrendData {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface ProductPerformance {
  productId: string;
  productName: string;
  quantitySold: number;
  totalRevenue: number;
  averagePrice: number;
}

export interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export function useReports(dateRange?: DateRange) {
  const { data } = useDataContext();

  // Filter data by date range
  const filteredSales = useMemo(() => {
    if (!dateRange) return data.sales || [];
    return (data.sales || []).filter(sale => {
      return sale.date >= dateRange.start && sale.date <= dateRange.end;
    });
  }, [data.sales, dateRange]);

  const filteredExpenses = useMemo(() => {
    if (!dateRange) return data.expenses || [];
    return (data.expenses || []).filter(expense => {
      return expense.date >= dateRange.start && expense.date <= dateRange.end;
    });
  }, [data.expenses, dateRange]);

  const filteredTransactions = useMemo(() => {
    if (!dateRange) return data.cashTransactions || [];
    return (data.cashTransactions || []).filter(transaction => {
      return transaction.date >= dateRange.start && transaction.date <= dateRange.end;
    });
  }, [data.cashTransactions, dateRange]);

  // Calculate main metrics
  const metrics = useMemo((): ReportMetrics => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmountUSD, 0);
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amountUSD, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const transactionCount = filteredTransactions.length;
    const averageTransaction = transactionCount > 0 ? totalRevenue / filteredSales.length : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      transactionCount,
      averageTransaction,
    };
  }, [filteredSales, filteredExpenses, filteredTransactions]);

  // Calculate daily trends
  const dailyTrends = useMemo((): TrendData[] => {
    const trendMap = new Map<string, { revenue: number; expenses: number }>();

    // Aggregate sales by date
    filteredSales.forEach(sale => {
      const existing = trendMap.get(sale.date) || { revenue: 0, expenses: 0 };
      trendMap.set(sale.date, { ...existing, revenue: existing.revenue + sale.totalAmountUSD });
    });

    // Aggregate expenses by date
    filteredExpenses.forEach(expense => {
      const existing = trendMap.get(expense.date) || { revenue: 0, expenses: 0 };
      trendMap.set(expense.date, { ...existing, expenses: existing.expenses + expense.amountUSD });
    });

    // Convert to array and calculate profit
    return Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales, filteredExpenses]);

  // Calculate product performance
  const productPerformance = useMemo((): ProductPerformance[] => {
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    filteredSales.forEach(sale => {
      sale.products.forEach(product => {
        const existing = productMap.get(product.productId) || {
          name: product.productName,
          quantity: 0,
          revenue: 0,
        };
        productMap.set(product.productId, {
          name: product.productName,
          quantity: existing.quantity + product.quantityBags,
          revenue: existing.revenue + product.lineTotal,
        });
      });
    });

    return Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantitySold: data.quantity,
        totalRevenue: data.revenue,
        averagePrice: data.quantity > 0 ? data.revenue / data.quantity : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredSales]);

  // Calculate expense categories
  const expenseCategories = useMemo((): ExpenseCategory[] => {
    const categoryMap = new Map<string, { amount: number; count: number }>();

    filteredExpenses.forEach(expense => {
      const existing = categoryMap.get(expense.category) || { amount: 0, count: 0 };
      categoryMap.set(expense.category, {
        amount: existing.amount + expense.amountUSD,
        count: existing.count + 1,
      });
    });

    const totalExpenses = metrics.totalExpenses;

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, metrics.totalExpenses]);

  // Calculate today's metrics
  const todayMetrics = useMemo((): DailyMetrics => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = (data.sales || []).filter(sale => sale.date === today);
    const todayExpenses = (data.expenses || []).filter(expense => expense.date === today);
    const todayTransactions = (data.cashTransactions || []).filter(t => t.date === today);

    const totalRevenue = todaySales.reduce((sum, sale) => sum + sale.totalAmountUSD, 0);
    const totalExpenses = todayExpenses.reduce((sum, expense) => sum + expense.amountUSD, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      date: today,
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      transactionCount: todayTransactions.length,
      averageTransaction: todaySales.length > 0 ? totalRevenue / todaySales.length : 0,
    };
  }, [data.sales, data.expenses, data.cashTransactions]);

  // Calculate weekly metrics
  const weeklyMetrics = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const weekSales = (data.sales || []).filter(sale => sale.date >= weekStartStr);
    const weekExpenses = (data.expenses || []).filter(expense => expense.date >= weekStartStr);
    const weekTransactions = (data.cashTransactions || []).filter(t => t.date >= weekStartStr);

    const totalRevenue = weekSales.reduce((sum, sale) => sum + sale.totalAmountUSD, 0);
    const totalExpenses = weekExpenses.reduce((sum, expense) => sum + expense.amountUSD, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      transactionCount: weekTransactions.length,
      averageTransaction: weekSales.length > 0 ? totalRevenue / weekSales.length : 0,
    };
  }, [data.sales, data.expenses, data.cashTransactions]);

  // Calculate monthly metrics
  const monthlyMetrics = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const monthSales = (data.sales || []).filter(sale => sale.date >= monthStartStr);
    const monthExpenses = (data.expenses || []).filter(expense => expense.date >= monthStartStr);
    const monthTransactions = (data.cashTransactions || []).filter(t => t.date >= monthStartStr);

    const totalRevenue = monthSales.reduce((sum, sale) => sum + sale.totalAmountUSD, 0);
    const totalExpenses = monthExpenses.reduce((sum, expense) => sum + expense.amountUSD, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      transactionCount: monthTransactions.length,
      averageTransaction: monthSales.length > 0 ? totalRevenue / monthSales.length : 0,
    };
  }, [data.sales, data.expenses, data.cashTransactions]);

  // Calculate P&L (Profit & Loss)
  const profitLoss = useMemo(() => {
    // Calculate COGS based on actual products sold
    // COGS = Sum of (quantity sold × cost per bag) for all sales
    const totalCOGS = filteredSales.reduce((sum, sale) => {
      const saleCOGS = sale.products.reduce((saleSum, saleProduct) => {
        // Find the product to get its cost per bag
        const product = (data.products || []).find(p => p.id === saleProduct.productId);
        if (product) {
          // Multiply quantity sold by the product's cost per bag
          return saleSum + (saleProduct.quantityBags * product.costPerBagUSD);
        }
        return saleSum;
      }, 0);
      return sum + saleCOGS;
    }, 0);

    const revenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmountUSD, 0);
    const operatingExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amountUSD, 0);
    const grossProfit = revenue - totalCOGS;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netProfit = grossProfit - operatingExpenses;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      revenue,
      cogs: totalCOGS,
      grossProfit,
      grossMargin,
      operatingExpenses,
      netProfit,
      netMargin,
    };
  }, [filteredSales, filteredExpenses, data.products]);

  return {
    metrics,
    dailyTrends,
    productPerformance,
    expenseCategories,
    todayMetrics,
    weeklyMetrics,
    monthlyMetrics,
    profitLoss,
    filteredSales,
    filteredExpenses,
    filteredTransactions,
  };
}

import { DollarSign, TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';
import { useReports, DateRange } from '../../hooks/useReports';
import ReportCard from './ReportCard';
import ChartCard from './ChartCard';
import EmptyState from './EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DailyReportProps {
  dateRange?: DateRange | null;
}

export default function DailyReport({ dateRange }: DailyReportProps) {
  const { todayMetrics, dailyTrends, filteredSales, filteredExpenses, filteredTransactions } = useReports(dateRange || undefined);

  const hasData = filteredTransactions.length > 0;

  // Get last 7 days for comparison
  const last7Days = dailyTrends.slice(-7);

  // Calculate yesterday's metrics for comparison
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdayData = dailyTrends.find(d => d.date === yesterdayStr);

  const getChange = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, isPositive: current >= 0 };
    const change = ((current - previous) / previous) * 100;
    return { value: change, isPositive: change >= 0 };
  };

  const revenueChange = yesterdayData ? getChange(todayMetrics.totalRevenue, yesterdayData.revenue) : undefined;
  const expenseChange = yesterdayData ? getChange(todayMetrics.totalExpenses, yesterdayData.expenses) : undefined;
  const profitChange = yesterdayData ? getChange(todayMetrics.netProfit, yesterdayData.profit) : undefined;

  if (!hasData) {
    return (
      <EmptyState
        title="No data for today"
        message="Start recording sales and expenses to see your daily report"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-creed-text-bright mb-1 flex items-center gap-2">
          <Clock className="w-5 h-5 text-creed-primary" />
          Daily Report - {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h2>
        <p className="text-creed-muted text-sm">Today's business performance at a glance</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard
          title="Today's Revenue"
          value={`$${todayMetrics.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          trend={revenueChange}
          subtitle="Total sales today"
          colorScheme="success"
        />

        <ReportCard
          title="Today's Expenses"
          value={`$${todayMetrics.totalExpenses.toFixed(2)}`}
          icon={TrendingDown}
          trend={expenseChange}
          subtitle="Total expenses today"
          colorScheme="danger"
        />

        <ReportCard
          title="Net Profit"
          value={`$${todayMetrics.netProfit.toFixed(2)}`}
          icon={TrendingUp}
          trend={profitChange}
          subtitle={todayMetrics.netProfit >= 0 ? 'Profit today' : 'Loss today'}
          colorScheme={todayMetrics.netProfit >= 0 ? 'success' : 'danger'}
        />

        <ReportCard
          title="Transactions"
          value={todayMetrics.transactionCount}
          icon={Activity}
          subtitle="Total transactions"
          colorScheme="primary"
        />
      </div>

      {/* Today's Summary */}
      <div
        className="backdrop-blur-sm rounded-lg border shadow-card"
        style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px',
        }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: '#2d3748' }}>
          <h3 className="text-base font-semibold text-creed-text-bright">Today's Summary</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Sales */}
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-creed-muted">Total Sales</span>
                <TrendingUp className="w-4 h-4 text-creed-success" />
              </div>
              <p className="text-2xl font-bold text-creed-success">
                ${todayMetrics.totalRevenue.toFixed(2)}
              </p>
              <p className="text-xs text-creed-muted mt-1">
                {filteredSales.length} transaction{filteredSales.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Total Expenses */}
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-creed-muted">Total Expenses</span>
                <TrendingDown className="w-4 h-4 text-creed-danger" />
              </div>
              <p className="text-2xl font-bold text-creed-danger">
                ${todayMetrics.totalExpenses.toFixed(2)}
              </p>
              <p className="text-xs text-creed-muted mt-1">
                {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

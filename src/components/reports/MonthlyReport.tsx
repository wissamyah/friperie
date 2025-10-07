import { CalendarDays, DollarSign, TrendingUp, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { useReports, DateRange } from '../../hooks/useReports';
import ReportCard from './ReportCard';
import ChartCard from './ChartCard';
import EmptyState from './EmptyState';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface MonthlyReportProps {
  dateRange?: DateRange | null;
}

export default function MonthlyReport({ dateRange }: MonthlyReportProps) {
  const { monthlyMetrics, dailyTrends, expenseCategories } = useReports(dateRange || undefined);

  // Get this month's daily data
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartStr = monthStart.toISOString().split('T')[0];

  const thisMonthData = dailyTrends.filter(d => d.date >= monthStartStr);
  const hasData = thisMonthData.length > 0;

  // Get last month's data for comparison
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lastMonthStartStr = lastMonthStart.toISOString().split('T')[0];
  const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];

  const lastMonthData = dailyTrends.filter(d => d.date >= lastMonthStartStr && d.date <= lastMonthEndStr);
  const lastMonthRevenue = lastMonthData.reduce((sum, d) => sum + d.revenue, 0);
  const lastMonthExpenses = lastMonthData.reduce((sum, d) => sum + d.expenses, 0);
  const lastMonthProfit = lastMonthRevenue - lastMonthExpenses;

  const getChange = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, isPositive: current >= 0 };
    const change = ((current - previous) / previous) * 100;
    return { value: change, isPositive: change >= 0 };
  };

  const revenueChange = getChange(monthlyMetrics.totalRevenue, lastMonthRevenue);
  const expenseChange = getChange(monthlyMetrics.totalExpenses, lastMonthExpenses);
  const profitChange = getChange(monthlyMetrics.netProfit, lastMonthProfit);

  const COLORS = ['#4a90e2', '#00d9ff', '#4ade80', '#facc15', '#ef4444', '#8b5cf6'];

  const pieData = expenseCategories.slice(0, 6).map((cat, index) => ({
    name: cat.category,
    value: cat.amount,
    color: COLORS[index % COLORS.length],
  }));

  if (!hasData) {
    return (
      <EmptyState
        title="No monthly data available"
        message="Start recording sales and expenses to see your monthly report"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-creed-text-bright mb-1 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-creed-primary" />
          Monthly Report - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <p className="text-creed-muted text-sm">Complete monthly performance overview</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard
          title="Month's Revenue"
          value={`$${monthlyMetrics.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          trend={revenueChange}
          subtitle="vs last month"
          colorScheme="success"
        />

        <ReportCard
          title="Month's Expenses"
          value={`$${monthlyMetrics.totalExpenses.toFixed(2)}`}
          icon={TrendingUp}
          trend={expenseChange}
          subtitle="vs last month"
          colorScheme="danger"
        />

        <ReportCard
          title="Net Profit"
          value={`$${monthlyMetrics.netProfit.toFixed(2)}`}
          icon={PieChartIcon}
          trend={profitChange}
          subtitle="vs last month"
          colorScheme={monthlyMetrics.netProfit >= 0 ? 'success' : 'danger'}
        />

        <ReportCard
          title="Transactions"
          value={monthlyMetrics.transactionCount}
          icon={Activity}
          subtitle="This month"
          colorScheme="primary"
        />
      </div>

      {/* Monthly Statistics */}
      <div className="grid grid-cols-1 gap-6">
        {/* Monthly Statistics */}
        <div
          className="backdrop-blur-sm rounded-lg border shadow-card p-6"
          style={{
            backgroundColor: '#1a2129',
            borderColor: '#2d3748',
            borderWidth: '1px',
          }}
        >
          <h3 className="text-base font-semibold text-creed-text-bright mb-4">Monthly Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: '#2d3748' }}>
              <span className="text-sm text-creed-muted">Days Elapsed</span>
              <span className="text-sm font-semibold text-creed-text">
                {thisMonthData.length} / {new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: '#2d3748' }}>
              <span className="text-sm text-creed-muted">Avg Daily Revenue</span>
              <span className="text-sm font-semibold text-creed-success">
                ${thisMonthData.length > 0 ? (monthlyMetrics.totalRevenue / thisMonthData.length).toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: '#2d3748' }}>
              <span className="text-sm text-creed-muted">Avg Daily Expenses</span>
              <span className="text-sm font-semibold text-creed-danger">
                ${thisMonthData.length > 0 ? (monthlyMetrics.totalExpenses / thisMonthData.length).toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-creed-muted">Profit Margin</span>
              <span className={`text-sm font-semibold ${monthlyMetrics.profitMargin >= 0 ? 'text-creed-success' : 'text-creed-danger'}`}>
                {monthlyMetrics.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Calendar, DollarSign, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { useReports, DateRange } from '../../hooks/useReports';
import ReportCard from './ReportCard';
import ChartCard from './ChartCard';
import EmptyState from './EmptyState';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface WeeklyReportProps {
  dateRange?: DateRange | null;
}

export default function WeeklyReport({ dateRange }: WeeklyReportProps) {
  const { weeklyMetrics, dailyTrends } = useReports(dateRange || undefined);

  // Get this week's data (last 7 days from today)
  const thisWeekData = dailyTrends.slice(-7);
  const hasData = thisWeekData.length > 0;

  // Get last week's data (8-14 days ago)
  const lastWeekData = dailyTrends.slice(-14, -7);
  const lastWeekRevenue = lastWeekData.reduce((sum, d) => sum + d.revenue, 0);
  const lastWeekExpenses = lastWeekData.reduce((sum, d) => sum + d.expenses, 0);
  const lastWeekProfit = lastWeekRevenue - lastWeekExpenses;

  const getChange = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, isPositive: current >= 0 };
    const change = ((current - previous) / previous) * 100;
    return { value: change, isPositive: change >= 0 };
  };

  const revenueChange = getChange(weeklyMetrics.totalRevenue, lastWeekRevenue);
  const expenseChange = getChange(weeklyMetrics.totalExpenses, lastWeekExpenses);
  const profitChange = getChange(weeklyMetrics.netProfit, lastWeekProfit);

  // Calculate day of week performance
  const dayPerformance = thisWeekData.map(d => ({
    day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
    revenue: d.revenue,
    expenses: d.expenses,
    profit: d.profit,
  }));

  if (!hasData) {
    return (
      <EmptyState
        title="No weekly data available"
        message="Start recording sales and expenses to see your weekly report"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-creed-text-bright mb-1 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-creed-primary" />
          Weekly Report
        </h2>
        <p className="text-creed-muted text-sm">
          Week of {thisWeekData[0]?.date} to {thisWeekData[thisWeekData.length - 1]?.date}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard
          title="Week's Revenue"
          value={`$${weeklyMetrics.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          trend={revenueChange}
          subtitle="vs last week"
          colorScheme="success"
        />

        <ReportCard
          title="Week's Expenses"
          value={`$${weeklyMetrics.totalExpenses.toFixed(2)}`}
          icon={TrendingUp}
          trend={expenseChange}
          subtitle="vs last week"
          colorScheme="danger"
        />

        <ReportCard
          title="Net Profit"
          value={`$${weeklyMetrics.netProfit.toFixed(2)}`}
          icon={BarChart3}
          trend={profitChange}
          subtitle="vs last week"
          colorScheme={weeklyMetrics.netProfit >= 0 ? 'success' : 'danger'}
        />

        <ReportCard
          title="Transactions"
          value={weeklyMetrics.transactionCount}
          icon={Activity}
          subtitle="This week"
          colorScheme="primary"
        />
      </div>

      {/* Week Summary */}
      <div
        className="backdrop-blur-sm rounded-lg border shadow-card p-6"
        style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px',
        }}
      >
        <h3 className="text-base font-semibold text-creed-text-bright mb-4">Week Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#151a21' }}>
            <p className="text-xs text-creed-muted mb-1">Average Daily Revenue</p>
            <p className="text-xl font-bold text-creed-success">
              ${(weeklyMetrics.totalRevenue / 7).toFixed(2)}
            </p>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#151a21' }}>
            <p className="text-xs text-creed-muted mb-1">Average Daily Expenses</p>
            <p className="text-xl font-bold text-creed-danger">
              ${(weeklyMetrics.totalExpenses / 7).toFixed(2)}
            </p>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#151a21' }}>
            <p className="text-xs text-creed-muted mb-1">Profit Margin</p>
            <p className={`text-xl font-bold ${weeklyMetrics.profitMargin >= 0 ? 'text-creed-success' : 'text-creed-danger'}`}>
              {weeklyMetrics.profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

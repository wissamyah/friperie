import { FileText, DollarSign, Package, Receipt, TrendingUp } from 'lucide-react';
import { useReports, DateRange } from '../../hooks/useReports';
import ReportCard from './ReportCard';
import ChartCard from './ChartCard';
import EmptyState from './EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ProfitLossReportProps {
  dateRange?: DateRange | null;
}

export default function ProfitLossReport({ dateRange }: ProfitLossReportProps) {
  const { profitLoss, metrics } = useReports(dateRange || undefined);

  const hasData = metrics.totalRevenue > 0 || metrics.totalExpenses > 0;

  // P&L Statement Data
  const plData = [
    { label: 'Revenue', value: profitLoss.revenue, color: '#4ade80' },
    { label: 'COGS', value: -profitLoss.cogs, color: '#ef4444' },
    { label: 'Gross Profit', value: profitLoss.grossProfit, color: '#00d9ff' },
    { label: 'Operating Expenses', value: -profitLoss.operatingExpenses, color: '#facc15' },
    { label: 'Net Profit', value: profitLoss.netProfit, color: profitLoss.netProfit >= 0 ? '#4ade80' : '#ef4444' },
  ];

  if (!hasData) {
    return (
      <EmptyState
        title="No financial data available"
        message="Start recording sales, purchases, and expenses to see your P&L statement"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-creed-text-bright mb-1 flex items-center gap-2">
          <FileText className="w-5 h-5 text-creed-primary" />
          Profit & Loss Statement
        </h2>
        <p className="text-creed-muted text-sm">Comprehensive financial performance overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard
          title="Total Revenue"
          value={`$${profitLoss.revenue.toFixed(2)}`}
          icon={DollarSign}
          subtitle="Total sales"
          colorScheme="success"
        />

        <ReportCard
          title="Gross Profit"
          value={`$${profitLoss.grossProfit.toFixed(2)}`}
          icon={TrendingUp}
          subtitle={`${profitLoss.grossMargin.toFixed(1)}% margin`}
          colorScheme={profitLoss.grossProfit >= 0 ? 'success' : 'danger'}
        />

        <ReportCard
          title="Operating Expenses"
          value={`$${profitLoss.operatingExpenses.toFixed(2)}`}
          icon={Receipt}
          subtitle="Total expenses"
          colorScheme="warning"
        />

        <ReportCard
          title="Net Profit"
          value={`$${profitLoss.netProfit.toFixed(2)}`}
          icon={Package}
          subtitle={`${profitLoss.netMargin.toFixed(1)}% margin`}
          colorScheme={profitLoss.netProfit >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Detailed P&L Statement */}
      <div
        className="backdrop-blur-sm rounded-lg border shadow-card"
        style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px',
        }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: '#2d3748' }}>
          <h3 className="text-base font-semibold text-creed-text-bright">Detailed Statement</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {/* Revenue Section */}
            <div className="pb-3 border-b" style={{ borderColor: '#2d3748' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-creed-text">Revenue</span>
                <span className="text-sm font-bold text-creed-success">
                  ${profitLoss.revenue.toFixed(2)}
                </span>
              </div>
            </div>

            {/* COGS Section */}
            <div className="pb-3 border-b" style={{ borderColor: '#2d3748' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-creed-text">Cost of Goods Sold (COGS)</span>
                <span className="text-sm font-bold text-creed-danger">
                  ${profitLoss.cogs.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-creed-muted">From closed containers</p>
            </div>

            {/* Gross Profit */}
            <div className="pb-3 border-b" style={{ borderColor: '#2d3748' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-creed-text">Gross Profit</span>
                <span className={`text-sm font-bold ${profitLoss.grossProfit >= 0 ? 'text-creed-success' : 'text-creed-danger'}`}>
                  ${profitLoss.grossProfit.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-creed-muted">
                Gross Margin: {profitLoss.grossMargin.toFixed(1)}%
              </p>
            </div>

            {/* Operating Expenses */}
            <div className="pb-3 border-b" style={{ borderColor: '#2d3748' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-creed-text">Operating Expenses</span>
                <span className="text-sm font-bold text-creed-warning">
                  ${profitLoss.operatingExpenses.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-creed-muted">All recorded expenses</p>
            </div>

            {/* Net Profit */}
            <div className="pt-3">
              <div className="flex justify-between items-center p-4 rounded-lg" style={{
                backgroundColor: profitLoss.netProfit >= 0 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              }}>
                <span className="text-lg font-bold text-creed-text-bright">Net Profit</span>
                <span className={`text-2xl font-bold ${profitLoss.netProfit >= 0 ? 'text-creed-success' : 'text-creed-danger'}`}>
                  ${profitLoss.netProfit.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-creed-muted mt-2 text-center">
                Net Margin: {profitLoss.netMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Ratios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: '#1a2129',
            borderColor: '#2d3748',
            borderWidth: '1px',
          }}
        >
          <p className="text-xs text-creed-muted mb-2">Gross Profit Margin</p>
          <p className={`text-3xl font-bold ${profitLoss.grossMargin >= 0 ? 'text-creed-success' : 'text-creed-danger'}`}>
            {profitLoss.grossMargin.toFixed(1)}%
          </p>
          <p className="text-xs text-creed-muted mt-1">Revenue minus COGS</p>
        </div>

        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: '#1a2129',
            borderColor: '#2d3748',
            borderWidth: '1px',
          }}
        >
          <p className="text-xs text-creed-muted mb-2">Operating Expense Ratio</p>
          <p className="text-3xl font-bold text-creed-warning">
            {profitLoss.revenue > 0 ? ((profitLoss.operatingExpenses / profitLoss.revenue) * 100).toFixed(1) : '0.0'}%
          </p>
          <p className="text-xs text-creed-muted mt-1">Expenses as % of revenue</p>
        </div>

        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: '#1a2129',
            borderColor: '#2d3748',
            borderWidth: '1px',
          }}
        >
          <p className="text-xs text-creed-muted mb-2">Net Profit Margin</p>
          <p className={`text-3xl font-bold ${profitLoss.netMargin >= 0 ? 'text-creed-success' : 'text-creed-danger'}`}>
            {profitLoss.netMargin.toFixed(1)}%
          </p>
          <p className="text-xs text-creed-muted mt-1">Bottom line profitability</p>
        </div>
      </div>
    </div>
  );
}

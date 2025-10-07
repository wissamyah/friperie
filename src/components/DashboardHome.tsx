import { useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  AlertTriangle,
  Truck,
  Container,
  Activity,
  ShoppingCart,
  Receipt,
  ArrowRight,
  BarChart3,
  Calendar
} from 'lucide-react';
import { useReports } from '../hooks/useReports';
import { useDataContext } from '../contexts/DataContext';
import { useCashSituation } from '../hooks/useCashSituation';
import ReportCard from './reports/ReportCard';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardHome() {
  const { todayMetrics, weeklyMetrics, monthlyMetrics, dailyTrends, productPerformance } = useReports();
  const { data } = useDataContext();
  const { currentBalance } = useCashSituation();

  // Calculate trends vs yesterday
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

  // Get last month's data for comparison
  const now = new Date();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lastMonthStartStr = lastMonthStart.toISOString().split('T')[0];
  const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];

  const lastMonthData = dailyTrends.filter(d => d.date >= lastMonthStartStr && d.date <= lastMonthEndStr);
  const lastMonthRevenue = lastMonthData.reduce((sum, d) => sum + d.revenue, 0);
  const lastMonthExpenses = lastMonthData.reduce((sum, d) => sum + d.expenses, 0);
  const lastMonthProfit = lastMonthRevenue - lastMonthExpenses;

  const monthRevenueChange = getChange(monthlyMetrics.totalRevenue, lastMonthRevenue);
  const monthExpenseChange = getChange(monthlyMetrics.totalExpenses, lastMonthExpenses);
  const monthProfitChange = getChange(monthlyMetrics.netProfit, lastMonthProfit);

  // Calculate inventory metrics
  const products = data.products || [];
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.quantity > 0 && p.quantity < 10);
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.costPerBagUSD), 0);

  // Calculate operational metrics
  const suppliers = data.suppliers || [];
  const containers = data.containers || [];
  const openContainers = containers.filter(c => c.containerStatus === 'open');
  const unpaidContainers = containers.filter(c => c.paymentStatus === 'unpaid' || c.paymentStatus === 'partial');

  // Last 7 days trend data
  const last7Days = dailyTrends.slice(-7).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: d.revenue,
    expenses: d.expenses,
  }));

  // Top 5 products
  const topProducts = productPerformance.slice(0, 5).map(p => ({
    name: p.productName.length > 15 ? p.productName.substring(0, 15) + '...' : p.productName,
    revenue: p.totalRevenue,
  }));

  // Recent activity (last 5 transactions)
  const recentTransactions = useMemo(() => {
    const sales = (data.sales || []).map(s => ({ ...s, type: 'sale' as const }));
    const expenses = (data.expenses || []).map(e => ({ ...e, type: 'expense' as const }));
    return [...sales, ...expenses]
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
      .slice(0, 5);
  }, [data.sales, data.expenses]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-creed-text-bright mb-1">Dashboard</h1>
        <p className="text-creed-muted">
          Welcome back! Here's your business overview for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Section 1: Today's KPIs */}
      <div>
        <h2 className="text-sm font-semibold text-creed-muted uppercase tracking-wide mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Today's Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportCard
            title="Today's Revenue"
            value={`$${todayMetrics.totalRevenue.toFixed(2)}`}
            icon={DollarSign}
            trend={revenueChange}
            subtitle="vs yesterday"
            colorScheme="success"
          />
          <ReportCard
            title="Today's Expenses"
            value={`$${todayMetrics.totalExpenses.toFixed(2)}`}
            icon={TrendingDown}
            trend={expenseChange}
            subtitle="vs yesterday"
            colorScheme="danger"
          />
          <ReportCard
            title="Net Profit"
            value={`$${todayMetrics.netProfit.toFixed(2)}`}
            icon={TrendingUp}
            trend={profitChange}
            subtitle="vs yesterday"
            colorScheme={todayMetrics.netProfit >= 0 ? 'success' : 'danger'}
          />
          <ReportCard
            title="Cash Balance"
            value={`$${currentBalance.toFixed(2)}`}
            icon={Wallet}
            subtitle="Current balance"
            colorScheme="primary"
          />
        </div>
      </div>

      {/* Section 2: Monthly Business Health */}
      <div>
        <h2 className="text-sm font-semibold text-creed-muted uppercase tracking-wide mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Monthly Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportCard
            title="Monthly Revenue"
            value={`$${monthlyMetrics.totalRevenue.toFixed(2)}`}
            icon={DollarSign}
            trend={monthRevenueChange}
            subtitle="vs last month"
            colorScheme="success"
          />
          <ReportCard
            title="Monthly Expenses"
            value={`$${monthlyMetrics.totalExpenses.toFixed(2)}`}
            icon={Receipt}
            trend={monthExpenseChange}
            subtitle="vs last month"
            colorScheme="danger"
          />
          <ReportCard
            title="Monthly Profit"
            value={`$${monthlyMetrics.netProfit.toFixed(2)}`}
            icon={TrendingUp}
            trend={monthProfitChange}
            subtitle="vs last month"
            colorScheme={monthlyMetrics.netProfit >= 0 ? 'success' : 'danger'}
          />
          <ReportCard
            title="Profit Margin"
            value={`${monthlyMetrics.profitMargin.toFixed(1)}%`}
            icon={Activity}
            subtitle="This month"
            colorScheme={monthlyMetrics.profitMargin >= 0 ? 'success' : 'danger'}
          />
        </div>
      </div>

      {/* Section 3: Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Trend */}
        <div
          className="backdrop-blur-sm rounded-lg border shadow-card"
          style={{
            backgroundColor: '#1a2129',
            borderColor: '#2d3748',
            borderWidth: '1px',
          }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: '#2d3748' }}>
            <h3 className="text-base font-semibold text-creed-text-bright">7-Day Trend</h3>
            <p className="text-xs text-creed-muted mt-0.5">Revenue vs Expenses</p>
          </div>
          <div className="p-4" style={{ height: '250px' }}>
            {last7Days.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last7Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f1419',
                      border: '1px solid #4a90e2',
                      borderRadius: '8px',
                      color: '#ffffff',
                    }}
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4ade80"
                    strokeWidth={2}
                    dot={{ fill: '#4ade80', r: 4 }}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', r: 4 }}
                    name="Expenses"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-creed-muted text-sm">
                No trend data available
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div
          className="backdrop-blur-sm rounded-lg border shadow-card"
          style={{
            backgroundColor: '#1a2129',
            borderColor: '#2d3748',
            borderWidth: '1px',
          }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: '#2d3748' }}>
            <h3 className="text-base font-semibold text-creed-text-bright">Top 5 Products</h3>
            <p className="text-xs text-creed-muted mt-0.5">By revenue</p>
          </div>
          <div className="p-4" style={{ height: '250px' }}>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis
                    type="number"
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f1419',
                      border: '1px solid #4a90e2',
                      borderRadius: '8px',
                      color: '#ffffff',
                    }}
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                  <Bar dataKey="revenue" fill="#4a90e2" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-creed-muted text-sm">
                No product data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 4: Operational Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Inventory Status */}
        <div
          className="backdrop-blur-sm rounded-lg border shadow-card p-4"
          style={{
            backgroundColor: '#1a2129',
            borderColor: '#2d3748',
            borderWidth: '1px',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-creed-primary/10">
              <Package className="w-4 h-4 text-creed-primary" />
            </div>
            <h3 className="text-sm font-semibold text-creed-text-bright">Inventory</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#2d3748' }}>
              <span className="text-xs text-creed-muted">Total Products</span>
              <span className="text-sm font-semibold text-creed-text">{totalProducts}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#2d3748' }}>
              <span className="text-xs text-creed-muted flex items-center gap-1">
                Low Stock
                {lowStockProducts.length > 0 && (
                  <AlertTriangle className="w-3 h-3 text-creed-warning" />
                )}
              </span>
              <span className={`text-sm font-semibold ${lowStockProducts.length > 0 ? 'text-creed-warning' : 'text-creed-text'}`}>
                {lowStockProducts.length}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-creed-muted">Total Value</span>
              <span className="text-sm font-semibold text-creed-success">${totalInventoryValue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div
          className="backdrop-blur-sm rounded-lg border shadow-card p-4"
          style={{
            backgroundColor: '#1a2129',
            borderColor: '#2d3748',
            borderWidth: '1px',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-creed-accent/10">
              <Activity className="w-4 h-4 text-creed-accent" />
            </div>
            <h3 className="text-sm font-semibold text-creed-text-bright">Quick Stats</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#2d3748' }}>
              <span className="text-xs text-creed-muted flex items-center gap-1">
                <Truck className="w-3 h-3" />
                Suppliers
              </span>
              <span className="text-sm font-semibold text-creed-text">{suppliers.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#2d3748' }}>
              <span className="text-xs text-creed-muted flex items-center gap-1">
                <Container className="w-3 h-3" />
                Open Containers
              </span>
              <span className="text-sm font-semibold text-creed-text">{openContainers.length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-creed-muted flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Pending Payments
              </span>
              <span className={`text-sm font-semibold ${unpaidContainers.length > 0 ? 'text-creed-warning' : 'text-creed-text'}`}>
                {unpaidContainers.length}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="backdrop-blur-sm rounded-lg border shadow-card p-4"
          style={{
            backgroundColor: '#1a2129',
            borderColor: '#2d3748',
            borderWidth: '1px',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-creed-secondary/10">
                <Activity className="w-4 h-4 text-creed-secondary" />
              </div>
              <h3 className="text-sm font-semibold text-creed-text-bright">Recent Activity</h3>
            </div>
          </div>
          <div className="space-y-2">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((txn, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 py-2 border-b last:border-b-0"
                  style={{ borderColor: '#2d3748' }}
                >
                  <div className={`p-1 rounded ${txn.type === 'sale' ? 'bg-creed-success/10' : 'bg-creed-danger/10'}`}>
                    {txn.type === 'sale' ? (
                      <ShoppingCart className="w-3 h-3 text-creed-success" />
                    ) : (
                      <Receipt className="w-3 h-3 text-creed-danger" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-creed-text truncate">
                      {txn.type === 'sale' ? 'Sale' : (txn as any).category}
                    </p>
                    <p className="text-[10px] text-creed-muted">
                      {new Date(txn.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ${txn.type === 'sale' ? 'text-creed-success' : 'text-creed-danger'}`}>
                    {txn.type === 'sale' ? '+' : '-'}${((txn as any).totalAmountUSD || (txn as any).amountUSD).toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-creed-muted text-center py-4">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Section 5: Quick Actions (Optional) */}
      {lowStockProducts.length > 0 && (
        <div
          className="backdrop-blur-sm rounded-lg border shadow-card p-4"
          style={{
            backgroundColor: '#1f1206',
            borderColor: '#d97706',
            borderWidth: '1px',
          }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-200">Low Stock Alert</h3>
              <p className="text-xs text-yellow-300/80 mt-1">
                {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} running low on stock (less than 10 bags).
                Consider restocking soon.
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {lowStockProducts.slice(0, 3).map(p => (
                  <span
                    key={p.id}
                    className="text-[10px] px-2 py-1 rounded bg-yellow-500/20 text-yellow-200"
                  >
                    {p.name} ({p.quantity} bags)
                  </span>
                ))}
                {lowStockProducts.length > 3 && (
                  <span className="text-[10px] px-2 py-1 text-yellow-300/70">
                    +{lowStockProducts.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

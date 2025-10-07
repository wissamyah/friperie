import { ShoppingCart, TrendingUp, Package, DollarSign } from 'lucide-react';
import { useReports, DateRange } from '../../hooks/useReports';
import ReportCard from './ReportCard';
import ChartCard from './ChartCard';
import EmptyState from './EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface SalesReportProps {
  dateRange?: DateRange | null;
}

export default function SalesReport({ dateRange }: SalesReportProps) {
  const { metrics, productPerformance, dailyTrends, filteredSales } = useReports(dateRange || undefined);

  const hasData = filteredSales.length > 0;

  // Calculate sales metrics
  const totalSales = filteredSales.length;
  const averageTransactionValue = totalSales > 0 ? metrics.totalRevenue / totalSales : 0;
  const totalQuantitySold = productPerformance.reduce((sum, p) => sum + p.quantitySold, 0);

  // Top performing products (top 10)
  const topProducts = productPerformance.slice(0, 10);

  if (!hasData) {
    return (
      <EmptyState
        title="No sales data available"
        message="Start recording sales to see your sales analysis"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-creed-text-bright mb-1 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-creed-primary" />
          Sales Report
        </h2>
        <p className="text-creed-muted text-sm">Comprehensive sales analysis and product performance</p>
      </div>

      {/* Sales Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard
          title="Total Revenue"
          value={`$${metrics.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          subtitle="From all sales"
          colorScheme="success"
        />

        <ReportCard
          title="Total Sales"
          value={totalSales}
          icon={ShoppingCart}
          subtitle="Number of transactions"
          colorScheme="primary"
        />

        <ReportCard
          title="Avg Transaction"
          value={`$${averageTransactionValue.toFixed(2)}`}
          icon={TrendingUp}
          subtitle="Per sale"
          colorScheme="primary"
        />

        <ReportCard
          title="Units Sold"
          value={totalQuantitySold}
          icon={Package}
          subtitle="Total bags sold"
          colorScheme="success"
        />
      </div>

      {/* Product Performance Table */}
      <div
        className="backdrop-blur-sm rounded-lg border shadow-card"
        style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px',
        }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: '#2d3748' }}>
          <h3 className="text-base font-semibold text-creed-text-bright">Product Performance Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: '#2d3748' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-creed-muted uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-creed-muted uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-creed-muted uppercase tracking-wider">
                  Units Sold
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-creed-muted uppercase tracking-wider">
                  Avg Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-creed-muted uppercase tracking-wider">
                  Total Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {productPerformance.map((product, index) => (
                <tr
                  key={product.productId}
                  className="border-b hover:bg-creed-primary/5 transition-colors"
                  style={{ borderColor: '#2d3748' }}
                >
                  <td className="px-4 py-3 text-sm text-creed-text">
                    #{index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-creed-text">
                    {product.productName}
                  </td>
                  <td className="px-4 py-3 text-sm text-creed-text text-right">
                    {product.quantitySold} bags
                  </td>
                  <td className="px-4 py-3 text-sm text-creed-text text-right">
                    ${product.averagePrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-creed-success text-right">
                    ${product.totalRevenue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

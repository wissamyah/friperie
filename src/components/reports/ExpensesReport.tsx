import { Receipt, TrendingDown, PieChart as PieChartIcon, DollarSign } from 'lucide-react';
import { useReports, DateRange } from '../../hooks/useReports';
import ReportCard from './ReportCard';
import ChartCard from './ChartCard';
import EmptyState from './EmptyState';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ExpensesReportProps {
  dateRange?: DateRange | null;
}

export default function ExpensesReport({ dateRange }: ExpensesReportProps) {
  const { metrics, expenseCategories, filteredExpenses } = useReports(dateRange || undefined);

  const hasData = filteredExpenses.length > 0;

  const totalExpenses = filteredExpenses.length;
  const averageExpense = totalExpenses > 0 ? metrics.totalExpenses / totalExpenses : 0;

  const COLORS = ['#4a90e2', '#00d9ff', '#4ade80', '#facc15', '#ef4444', '#8b5cf6', '#ec4899', '#f97316'];

  const pieData = expenseCategories.map((cat, index) => ({
    name: cat.category,
    value: cat.amount,
    color: COLORS[index % COLORS.length],
  }));

  if (!hasData) {
    return (
      <EmptyState
        title="No expense data available"
        message="Start recording expenses to see your expense analysis"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-creed-text-bright mb-1 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-creed-primary" />
          Expenses Report
        </h2>
        <p className="text-creed-muted text-sm">Detailed expense analysis by category</p>
      </div>

      {/* Expense Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard
          title="Total Expenses"
          value={`$${metrics.totalExpenses.toFixed(2)}`}
          icon={DollarSign}
          subtitle="All expenses"
          colorScheme="danger"
        />

        <ReportCard
          title="Expense Count"
          value={totalExpenses}
          icon={Receipt}
          subtitle="Number of expenses"
          colorScheme="warning"
        />

        <ReportCard
          title="Avg Expense"
          value={`$${averageExpense.toFixed(2)}`}
          icon={TrendingDown}
          subtitle="Per transaction"
          colorScheme="warning"
        />

        <ReportCard
          title="Categories"
          value={expenseCategories.length}
          icon={PieChartIcon}
          subtitle="Expense categories"
          colorScheme="primary"
        />
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Expenses by Category"
          description="Distribution of expenses across categories"
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f1419',
                  border: '1px solid #4a90e2',
                  borderRadius: '8px',
                  color: '#ffffff',
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Category Table */}
        <div
          className="backdrop-blur-sm rounded-lg border shadow-card"
          style={{
            backgroundColor: '#1a2129',
            borderColor: '#2d3748',
            borderWidth: '1px',
          }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: '#2d3748' }}>
            <h3 className="text-base font-semibold text-creed-text-bright">Category Breakdown</h3>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {expenseCategories.map((category, index) => (
              <div
                key={category.category}
                className="p-3 rounded-lg border"
                style={{
                  backgroundColor: '#151a21',
                  borderColor: '#2d3748',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium text-creed-text">
                      {category.category}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-creed-danger">
                    ${category.amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-creed-muted">
                  <span>{category.count} transaction{category.count !== 1 ? 's' : ''}</span>
                  <span>{category.percentage.toFixed(1)}% of total</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Expenses */}
      <div
        className="backdrop-blur-sm rounded-lg border shadow-card"
        style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px',
        }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: '#2d3748' }}>
          <h3 className="text-base font-semibold text-creed-text-bright">Recent Expenses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: '#2d3748' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-creed-muted uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-creed-muted uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-creed-muted uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-creed-muted uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.slice(0, 20).map((expense) => (
                <tr
                  key={expense.id}
                  className="border-b hover:bg-creed-primary/5 transition-colors"
                  style={{ borderColor: '#2d3748' }}
                >
                  <td className="px-4 py-3 text-sm text-creed-text">
                    {new Date(expense.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-creed-text">
                    <span
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: 'rgba(250, 204, 21, 0.1)',
                        color: '#facc15',
                      }}
                    >
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-creed-muted">
                    {expense.description}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-creed-danger text-right">
                    ${expense.amountUSD.toFixed(2)}
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

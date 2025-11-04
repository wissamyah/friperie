import { useState, useMemo, useEffect } from 'react';
import { Receipt, TrendingDown, Layers, DollarSign, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useReports, DateRange } from '../../hooks/useReports';
import ReportCard from './ReportCard';
import EmptyState from './EmptyState';
import { formatDate } from '../../utils/dateFormatter';

interface ExpensesReportProps {
  dateRange?: DateRange | null;
}

export default function ExpensesReport({ dateRange }: ExpensesReportProps) {
  const { metrics, expenseCategories, filteredExpenses } = useReports(dateRange || undefined);

  // Pagination and sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const hasData = filteredExpenses.length > 0;

  const totalExpenses = filteredExpenses.length;
  const averageExpense = totalExpenses > 0 ? metrics.totalExpenses / totalExpenses : 0;

  const COLORS = ['#4a90e2', '#00d9ff', '#4ade80', '#facc15', '#ef4444', '#8b5cf6', '#ec4899', '#f97316'];

  // Reset to page 1 when date range, sort, rows per page, or category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, sortDirection, rowsPerPage, selectedCategory]);

  // Get unique categories for the filter dropdown
  const uniqueCategories = useMemo(() => {
    const categories = Array.from(new Set(filteredExpenses.map(e => e.category))).sort();
    return categories;
  }, [filteredExpenses]);

  // Filter expenses by selected category
  const categoryFilteredExpenses = useMemo(() => {
    if (selectedCategory === 'all') {
      return filteredExpenses;
    }
    return filteredExpenses.filter(expense => expense.category === selectedCategory);
  }, [filteredExpenses, selectedCategory]);

  // Sort expenses by category
  const sortedExpenses = useMemo(() => {
    const sorted = [...categoryFilteredExpenses].sort((a, b) => {
      if (sortDirection === 'asc') {
        return a.category.localeCompare(b.category);
      } else {
        return b.category.localeCompare(a.category);
      }
    });
    return sorted;
  }, [categoryFilteredExpenses, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(sortedExpenses.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedExpenses = sortedExpenses.slice(startIndex, endIndex);

  // Handle sort toggle
  const handleSortToggle = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Handle page navigation
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

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
          icon={Layers}
          subtitle="Expense categories"
          colorScheme="primary"
        />
      </div>

      {/* Category Breakdown Table */}
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: '#2d3748' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-creed-muted uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-creed-muted uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-creed-muted uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-creed-muted uppercase tracking-wider">
                  Avg/Transaction
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-creed-muted uppercase tracking-wider">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody>
              {expenseCategories.map((category, index) => {
                const avgPerTransaction = category.count > 0 ? category.amount / category.count : 0;

                return (
                  <tr
                    key={category.category}
                    className="border-b hover:bg-creed-primary/5 transition-colors"
                    style={{ borderColor: '#2d3748' }}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-creed-text">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        {category.category}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-creed-text text-right">
                      {category.count}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-creed-danger text-right">
                      ${category.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-creed-text text-right">
                      ${avgPerTransaction.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-creed-primary text-right font-medium">
                      {category.percentage.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Expenses */}
      <div
        className="backdrop-blur-sm rounded-lg border shadow-card"
        style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px',
        }}
      >
        <div className="px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderColor: '#2d3748' }}>
          <div>
            <h3 className="text-base font-semibold text-creed-text-bright">All Expenses</h3>
            <p className="text-xs text-creed-muted mt-0.5">{sortedExpenses.length} record{sortedExpenses.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-sm rounded border bg-[#1a2129] text-creed-text min-w-[140px]"
              style={{ borderColor: '#2d3748' }}
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <label htmlFor="rowsPerPage" className="text-xs text-creed-muted whitespace-nowrap">
                Rows per page:
              </label>
              <select
                id="rowsPerPage"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="px-2 py-1 text-sm rounded border bg-[#1a2129] text-creed-text"
                style={{ borderColor: '#2d3748' }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: '#2d3748' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-creed-muted uppercase tracking-wider">
                  Date
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-creed-muted uppercase tracking-wider cursor-pointer hover:text-creed-primary transition-colors select-none"
                  onClick={handleSortToggle}
                >
                  <div className="flex items-center gap-1">
                    <span>Category</span>
                    {sortDirection === 'asc' ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
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
              {paginatedExpenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-b hover:bg-creed-primary/5 transition-colors"
                  style={{ borderColor: '#2d3748' }}
                >
                  <td className="px-4 py-3 text-sm text-creed-text">
                    {formatDate(expense.date)}
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
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: '#2d3748' }}>
            <div className="text-sm text-creed-muted">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                className="p-1.5 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-creed-primary/10 hover:border-creed-primary"
                style={{ borderColor: currentPage === 1 ? '#2d3748' : '#4a90e2' }}
                title="First page"
              >
                <ChevronsLeft className="w-4 h-4 text-creed-text" />
              </button>
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-1.5 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-creed-primary/10 hover:border-creed-primary"
                style={{ borderColor: currentPage === 1 ? '#2d3748' : '#4a90e2' }}
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4 text-creed-text" />
              </button>
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-creed-primary/10 hover:border-creed-primary"
                style={{ borderColor: currentPage === totalPages ? '#2d3748' : '#4a90e2' }}
                title="Next page"
              >
                <ChevronRight className="w-4 h-4 text-creed-text" />
              </button>
              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-creed-primary/10 hover:border-creed-primary"
                style={{ borderColor: currentPage === totalPages ? '#2d3748' : '#4a90e2' }}
                title="Last page"
              >
                <ChevronsRight className="w-4 h-4 text-creed-text" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

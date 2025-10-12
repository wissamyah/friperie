import { useState, useMemo } from 'react';
import { Plus, Trash2, Receipt, Edit2, X, Building2, Zap, Users, Megaphone, Package, Truck, Wrench, Calendar, DollarSign, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useExpenses } from '../hooks/useExpenses';
import { useSaveStatusContext } from '../contexts/SaveStatusContext';
import ConfirmModal from './ConfirmModal';
import Spinner from './Spinner';
import PageLoader from './PageLoader';
import { formatDate } from '../utils/dateFormatter';

// Category configuration with icons and colors
const categoryConfig = {
  'Rent': { icon: Building2, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  'Utilities': { icon: Zap, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  'Salaries': { icon: Users, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'Marketing': { icon: Megaphone, color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  'Supplies': { icon: Package, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'Transportation': { icon: Truck, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  'Maintenance': { icon: Wrench, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  'Other': { icon: Receipt, color: 'bg-creed-muted/20 text-creed-muted border-creed-muted/30' },
};

const categories = Object.keys(categoryConfig);

type CategoryKey = keyof typeof categoryConfig;

const ITEMS_PER_PAGE = 15;

export default function Expenses() {
  const {
    expenses,
    loading,
    error,
    createExpense,
    updateExpense,
    deleteExpense,
    isActionLoading,
  } = useExpenses();

  const { status: saveStatus } = useSaveStatusContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; description: string } | null>(null);

  // Form state
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [amountUSD, setAmountUSD] = useState<number>(0);
  const [description, setDescription] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Reset form
  const resetForm = () => {
    setDate(getTodayDate());
    setCategory('');
    setAmountUSD(0);
    setDescription('');
    setIsEditMode(false);
    setEditingExpenseId(null);
  };

  // Open create modal
  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleEditExpense = (expenseId: string) => {
    const expense = expenses.find((e) => e.id === expenseId);
    if (!expense) return;

    setIsEditMode(true);
    setEditingExpenseId(expenseId);
    setDate(expense.date);
    setCategory(expense.category);
    setAmountUSD(expense.amountUSD);
    setDescription(expense.description);
    setIsModalOpen(true);
  };

  // Validate form
  const isFormValid = () => {
    return date && category && amountUSD > 0 && description.trim();
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid()) return;

    try {
      let result;
      if (isEditMode && editingExpenseId) {
        result = await updateExpense(editingExpenseId, date, category, amountUSD, description.trim());
      } else {
        result = await createExpense(date, category, amountUSD, description.trim());
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to save expense');
      }

      // Success - close modal and reset form
      resetForm();
      setIsModalOpen(false);
    } catch (error: any) {
      alert(`Failed to ${isEditMode ? 'update' : 'create'} expense: ${error.message}`);
    }
  };

  // Handle delete
  const handleDeleteExpense = async () => {
    if (!deleteConfirm) return;

    const result = await deleteExpense(deleteConfirm.id);

    if (result.success) {
      setDeleteConfirm(null);
    } else {
      alert(`Failed to delete expense: ${result.error}`);
    }
  };

  // Pagination logic
  const { paginatedExpenses, totalPages } = useMemo(() => {
    // First sort expenses by date (newest first)
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate pagination
    const total = Math.ceil(sortedExpenses.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginated = sortedExpenses.slice(startIndex, endIndex);

    return { paginatedExpenses: paginated, totalPages: total };
  }, [expenses, currentPage]);

  // Reset to page 1 if current page exceeds total pages
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  // Pagination helper functions
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if there are fewer than maxPagesToShow
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push('...');
      }

      // Add pages around current page
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  if (loading) {
    return (
      <PageLoader
        title="Loading Expenses"
        message="Fetching your expense records"
        icon={
          <div
            className="p-4 rounded-xl border-2 border-creed-primary/20"
            style={{
              backgroundColor: '#151a21',
            }}
          >
            <Receipt className="w-12 h-12 text-creed-primary" />
          </div>
        }
      />
    );
  }

  if (error) {
    return (
      <div
        className="backdrop-blur-sm rounded-lg p-6 border"
        style={{
          backgroundColor: '#1a2129',
          borderColor: '#ef4444',
          borderWidth: '1px',
        }}
      >
        <p className="text-creed-danger">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-creed-text-bright mb-1">Expenses</h1>
          <p className="text-creed-muted">Track and manage business expenses</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          disabled={saveStatus === 'saving'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-creed-primary hover:opacity-90 transition-all shadow-button-3d disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden md:inline">Add Expense</span>
        </button>
      </div>

      {/* Expenses Table */}
      <div
        className="backdrop-blur-sm rounded-lg border shadow-card"
        style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px',
        }}
      >
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
                borderWidth: '1px',
              }}
            >
              <Receipt className="w-8 h-8 text-creed-muted" />
            </div>
            <h3 className="text-lg font-semibold text-creed-text mb-2">No expenses yet</h3>
            <p className="text-creed-muted">Get started by recording your first expense</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#2d3748' }}>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-creed-text">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-creed-text">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-creed-text">Description</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Amount</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedExpenses.map((expense) => {
                    const categoryInfo = categoryConfig[expense.category as CategoryKey] || categoryConfig['Other'];
                    const CategoryIcon = categoryInfo.icon;

                    return (
                      <tr
                        key={expense.id}
                        className="border-b transition-colors hover:bg-creed-primary/5"
                        style={{
                          borderColor: '#2d3748',
                          opacity: isActionLoading('delete', expense.id) ? 0.5 : 1,
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-creed-muted" />
                            <span className="text-xs text-creed-text">
                              {formatDate(expense.date)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${categoryInfo.color}`}
                          >
                            <CategoryIcon className="w-3 h-3 mr-1" />
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-1.5 max-w-xs">
                            <FileText className="w-3.5 h-3.5 text-creed-muted mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-creed-text truncate">{expense.description}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-bold text-creed-danger">
                            -${expense.amountUSD.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditExpense(expense.id)}
                              disabled={saveStatus === 'saving'}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg text-creed-accent hover:bg-creed-accent/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Edit expense"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({ id: expense.id, description: expense.description })
                              }
                              disabled={isActionLoading('delete', expense.id) || saveStatus === 'saving'}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg text-creed-danger hover:bg-creed-danger/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete expense"
                            >
                              {isActionLoading('delete', expense.id) ? (
                                <Spinner size="sm" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {expenses.length > 0 && totalPages > 1 && (
          <div className="px-4 md:px-6 py-4 border-t" style={{ borderColor: '#2d3748' }}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Pagination Info */}
              <div className="text-xs text-creed-muted">
                Showing <span className="font-semibold text-creed-text">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                <span className="font-semibold text-creed-text">
                  {Math.min(currentPage * ITEMS_PER_PAGE, expenses.length)}
                </span>{' '}
                of <span className="font-semibold text-creed-text">{expenses.length}</span> expenses
              </div>

              {/* Pagination Buttons */}
              <div className="flex items-center gap-1">
                {/* Previous Button */}
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-creed-primary/10"
                  style={{
                    backgroundColor: currentPage === 1 ? 'transparent' : '#1a2129',
                    borderColor: '#2d3748',
                    borderWidth: '1px',
                  }}
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4 text-creed-text" />
                </button>

                {/* Page Numbers */}
                <div className="hidden sm:flex items-center gap-1">
                  {getPageNumbers().map((page, index) => (
                    <div key={index}>
                      {page === '...' ? (
                        <span className="px-2 py-1 text-xs text-creed-muted">...</span>
                      ) : (
                        <button
                          onClick={() => goToPage(page as number)}
                          className={`min-w-[32px] px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                            currentPage === page
                              ? 'text-creed-accent'
                              : 'text-creed-text hover:bg-creed-primary/10'
                          }`}
                          style={{
                            backgroundColor: currentPage === page ? '#0d1117' : '#1a2129',
                            borderColor: currentPage === page ? '#00d9ff' : '#2d3748',
                            borderWidth: currentPage === page ? '2px' : '1px',
                          }}
                        >
                          {page}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mobile: Simple page indicator */}
                <div className="sm:hidden px-3 py-1.5 rounded-md text-xs font-medium text-creed-text" style={{
                  backgroundColor: '#1a2129',
                  borderColor: '#2d3748',
                  borderWidth: '1px',
                }}>
                  {currentPage} / {totalPages}
                </div>

                {/* Next Button */}
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-creed-primary/10"
                  style={{
                    backgroundColor: currentPage === totalPages ? 'transparent' : '#1a2129',
                    borderColor: '#2d3748',
                    borderWidth: '1px',
                  }}
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4 text-creed-text" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expense Modal (Create/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm"
            onClick={() => {
              if (isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving') return;
              setIsModalOpen(false);
              resetForm();
            }}
          />

          {/* Modal */}
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="relative w-full max-w-2xl rounded-xl border shadow-2xl"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
                borderWidth: '1px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-3.5 border-b"
                style={{ borderColor: '#2d3748' }}
              >
                <div>
                  <h2 className="text-lg font-semibold text-creed-text-bright">
                    {isEditMode ? 'Edit Expense' : 'New Expense'}
                  </h2>
                  <p className="text-xs text-creed-muted mt-0.5">
                    {isEditMode ? 'Update expense details' : 'Record a new business expense'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving') return;
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                  className="text-creed-muted hover:text-creed-text transition-colors rounded-lg p-1.5 hover:bg-creed-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                {/* Expense Information */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="w-3.5 h-3.5 text-creed-primary" />
                    <h3 className="text-xs font-semibold text-creed-text uppercase tracking-wide">
                      Expense Information
                    </h3>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-medium text-creed-muted mb-1.5">
                      Date <span className="text-creed-danger">*</span>
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                      className="w-full px-3 py-1.5 text-sm rounded-md border transition-all focus:ring-1 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text"
                      style={{
                        backgroundColor: '#0d1117',
                        borderColor: '#2d3748',
                        borderWidth: '1px',
                      }}
                      required
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-medium text-creed-muted mb-1.5">
                      Category <span className="text-creed-danger">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                      className="w-full px-3 py-1.5 text-sm rounded-md border transition-all focus:ring-1 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text"
                      style={{
                        backgroundColor: '#0d1117',
                        borderColor: '#2d3748',
                        borderWidth: '1px',
                      }}
                      required
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => {
                        const Icon = categoryConfig[cat as CategoryKey].icon;
                        return (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-medium text-creed-muted mb-1.5">
                      Amount (USD) <span className="text-creed-danger">*</span>
                    </label>
                    <input
                      type="number"
                      value={amountUSD || ''}
                      onChange={(e) => setAmountUSD(parseFloat(e.target.value) || 0)}
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                      className="w-full px-3 py-1.5 text-sm rounded-md border transition-all focus:ring-1 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text"
                      style={{
                        backgroundColor: '#0d1117',
                        borderColor: '#2d3748',
                        borderWidth: '1px',
                      }}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-creed-muted mb-1.5">
                      Description <span className="text-creed-danger">*</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe this expense..."
                      rows={3}
                      disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                      className="w-full px-3 py-1.5 text-sm rounded-md border transition-all focus:ring-1 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text placeholder-creed-muted resize-none"
                      style={{
                        backgroundColor: '#0d1117',
                        borderColor: '#2d3748',
                        borderWidth: '1px',
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Summary Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-3.5 h-3.5 text-creed-danger" />
                    <h3 className="text-xs font-semibold text-creed-text uppercase tracking-wide">Summary</h3>
                  </div>

                  <div
                    className="p-2.5 rounded-md border"
                    style={{
                      backgroundColor: '#0d1117',
                      borderColor: '#2d3748',
                      borderWidth: '1px',
                    }}
                  >
                    <div className="text-[10px] text-creed-muted mb-0.5 uppercase tracking-wide">
                      Total Expense Amount
                    </div>
                    <div className="text-lg font-bold text-creed-danger">
                      -${amountUSD.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: '#2d3748' }}>
                  <button
                    type="submit"
                    disabled={
                      !isFormValid() ||
                      isActionLoading(isEditMode ? 'update' : 'create') ||
                      saveStatus === 'saving'
                    }
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-sm text-white bg-creed-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isActionLoading(isEditMode ? 'update' : 'create') ? (
                      <>
                        <Spinner size="sm" />
                        {isEditMode ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Receipt className="w-4 h-4" />
                        {isEditMode ? 'Update Expense' : 'Create Expense'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                    className="px-4 py-2 rounded-md font-semibold text-sm text-creed-muted hover:text-creed-text hover:bg-creed-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => {
          if (isActionLoading('delete', deleteConfirm?.id || '')) return;
          setDeleteConfirm(null);
        }}
        onConfirm={handleDeleteExpense}
        title="Delete Expense"
        message={
          <>
            Are you sure you want to delete this expense:{' '}
            <strong className="text-creed-text-bright">
              {deleteConfirm ? deleteConfirm.description : ''}
            </strong>
            ?
            <br />
            <span className="text-creed-muted text-xs mt-1 block">
              This will remove the expense and update your cash balance.
            </span>
          </>
        }
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isActionLoading('delete', deleteConfirm?.id || '')}
      />
    </div>
  );
}

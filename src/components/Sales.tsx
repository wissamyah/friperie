import { useState, useMemo } from 'react';
import { Plus, Trash2, ShoppingCart, Edit2, X, Package, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSales } from '../hooks/useSales';
import { useProducts } from '../hooks/useProducts';
import { useSaveStatusContext } from '../contexts/SaveStatusContext';
import { SaleProductLine } from '../services/github/types';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import Spinner from './Spinner';
import PageLoader from './PageLoader';
import Tooltip from './Tooltip';
import { formatDate } from '../utils/dateFormatter';

const ITEMS_PER_PAGE = 15;

interface ProductRow {
  id: string;
  productId: string;
  quantityBags: number;
  sellingPriceUSD: number;
}

export default function Sales() {
  const {
    sales,
    loading,
    error,
    createSale,
    updateSale,
    deleteSale,
    isActionLoading,
  } = useSales();

  const { products } = useProducts();
  const { status: saveStatus } = useSaveStatusContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; date: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Form state
  const [date, setDate] = useState('');
  const [productRows, setProductRows] = useState<ProductRow[]>([
    { id: `row-${Date.now()}`, productId: '', quantityBags: 0, sellingPriceUSD: 0 },
  ]);

  // Calculate pagination
  const { paginatedSales, totalPages } = useMemo(() => {
    const total = Math.ceil(sales.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginated = sales.slice(startIndex, endIndex);

    return {
      paginatedSales: paginated,
      totalPages: total,
    };
  }, [sales, currentPage]);

  // Reset to page 1 when sales change
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
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

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Calculate line total for a row
  const calculateLineTotal = (quantityBags: number, sellingPriceUSD: number) => {
    return quantityBags * sellingPriceUSD;
  };

  // Calculate total sale amount
  const calculateTotalAmount = () => {
    return productRows.reduce((sum, row) => {
      return sum + calculateLineTotal(row.quantityBags, row.sellingPriceUSD);
    }, 0);
  };

  // Add new product row
  const addProductRow = () => {
    setProductRows([
      ...productRows,
      { id: `row-${Date.now()}`, productId: '', quantityBags: 0, sellingPriceUSD: 0 },
    ]);
  };

  // Remove product row
  const removeProductRow = (id: string) => {
    if (productRows.length > 1) {
      setProductRows(productRows.filter((row) => row.id !== id));
    }
  };

  // Update product row
  const updateProductRow = (id: string, field: keyof ProductRow, value: any) => {
    setProductRows(
      productRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  // Reset form
  const resetForm = () => {
    setDate(getTodayDate());
    setProductRows([{ id: `row-${Date.now()}`, productId: '', quantityBags: 0, sellingPriceUSD: 0 }]);
    setIsEditMode(false);
    setEditingSaleId(null);
  };

  // Open create modal
  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleEditSale = (saleId: string) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;

    setIsEditMode(true);
    setEditingSaleId(saleId);
    setDate(sale.date);
    setProductRows(
      sale.products.map((p) => ({
        id: `row-${Date.now()}-${Math.random()}`,
        productId: p.productId,
        quantityBags: p.quantityBags,
        sellingPriceUSD: p.sellingPriceUSD,
      }))
    );
    setIsModalOpen(true);
  };

  // Validate form
  const isFormValid = () => {
    if (!date) return false;
    if (productRows.length === 0) return false;

    // Check if all product rows are valid
    for (const row of productRows) {
      if (!row.productId || row.quantityBags <= 0 || row.sellingPriceUSD <= 0) {
        return false;
      }
    }

    return true;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid()) return;

    // Build sale product lines
    const saleProducts: SaleProductLine[] = productRows.map((row) => {
      const product = products.find((p) => p.id === row.productId);
      return {
        productId: row.productId,
        productName: product?.name || '',
        quantityBags: row.quantityBags,
        sellingPriceUSD: row.sellingPriceUSD,
        lineTotal: calculateLineTotal(row.quantityBags, row.sellingPriceUSD),
      };
    });

    try {
      let result;
      if (isEditMode && editingSaleId) {
        result = await updateSale(editingSaleId, date, saleProducts);
      } else {
        result = await createSale(date, saleProducts);
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to save sale');
      }

      // Success - close modal and reset form
      resetForm();
      setIsModalOpen(false);
    } catch (error: any) {
      alert(`Failed to ${isEditMode ? 'update' : 'create'} sale: ${error.message}`);
    }
  };

  // Handle delete
  const handleDeleteSale = async () => {
    if (!deleteConfirm) return;

    const result = await deleteSale(deleteConfirm.id);

    if (result.success) {
      setDeleteConfirm(null);
    } else {
      alert(`Failed to delete sale: ${result.error}`);
    }
  };

  if (loading) {
    return (
      <PageLoader
        title="Loading Sales"
        message="Fetching your sales data"
        icon={
          <div
            className="p-4 rounded-xl border-2 border-creed-primary/20"
            style={{
              backgroundColor: '#151a21',
            }}
          >
            <ShoppingCart className="w-12 h-12 text-creed-primary" />
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

  // Get available stock for a product
  const getAvailableStock = (productId: string): number => {
    const product = products.find((p) => p.id === productId);
    return product?.quantity || 0;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-creed-text-bright mb-1">Sales</h1>
          <p className="text-creed-muted">Record and manage product sales</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          disabled={saveStatus === 'saving'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-creed-primary hover:opacity-90 transition-all shadow-button-3d disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden md:inline">Add Sale</span>
        </button>
      </div>

      {/* Sales Table */}
      <div
        className="backdrop-blur-sm rounded-lg border shadow-card"
        style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px',
        }}
      >
        {sales.length === 0 ? (
          <div className="text-center py-12">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
                borderWidth: '1px',
              }}
            >
              <ShoppingCart className="w-8 h-8 text-creed-muted" />
            </div>
            <h3 className="text-lg font-semibold text-creed-text mb-2">No sales yet</h3>
            <p className="text-creed-muted">Get started by recording your first sale</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#2d3748' }}>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-creed-text">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-creed-text">Products</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Total Amount</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b transition-colors hover:bg-creed-primary/5"
                    style={{
                      borderColor: '#2d3748',
                      opacity: isActionLoading('delete', sale.id) ? 0.5 : 1,
                    }}
                  >
                    <td className="px-4 py-2 text-creed-muted text-xs">
                      {formatDate(sale.date)}
                    </td>
                    <td className="px-4 py-2">
                      <Tooltip
                        content={
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-3">
                              <Package className="w-4 h-4 text-creed-primary" />
                              <span className="text-xs font-semibold text-creed-text-bright">
                                Sale Products
                              </span>
                            </div>
                            <div className="space-y-2">
                              {sale.products.map((product, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between items-start gap-3 pb-2 border-b border-creed-primary/10 last:border-0 last:pb-0"
                                >
                                  <div className="flex-1">
                                    <div className="text-xs font-medium text-creed-text">
                                      {product.productName}
                                    </div>
                                    <div className="text-[10px] text-creed-muted mt-0.5">
                                      {product.quantityBags} bags × ${product.sellingPriceUSD.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="text-xs font-semibold text-creed-primary">
                                    ${product.lineTotal.toFixed(2)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        }
                      >
                        <div className="flex items-center gap-1.5 cursor-help">
                          <Package className="w-3.5 h-3.5 text-creed-muted" />
                          <span className="text-xs text-creed-muted">
                            {sale.products.length} {sale.products.length === 1 ? 'product' : 'products'}
                          </span>
                        </div>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-2 text-right text-creed-accent text-xs font-medium">
                      ${sale.totalAmountUSD.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditSale(sale.id)}
                          disabled={saveStatus === 'saving'}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-creed-accent hover:bg-creed-accent/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Edit sale"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({ id: sale.id, date: sale.date })
                          }
                          disabled={isActionLoading('delete', sale.id) || saveStatus === 'saving'}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-creed-danger hover:bg-creed-danger/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete sale"
                        >
                          {isActionLoading('delete', sale.id) ? (
                            <Spinner size="sm" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {sales.length > 0 && totalPages > 1 && (
          <div className="px-4 md:px-6 py-4 border-t" style={{ borderColor: '#2d3748' }}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Pagination Info */}
              <div className="text-xs text-creed-muted">
                Showing <span className="font-semibold text-creed-text">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                <span className="font-semibold text-creed-text">
                  {Math.min(currentPage * ITEMS_PER_PAGE, sales.length)}
                </span>{' '}
                of <span className="font-semibold text-creed-text">{sales.length}</span> sales
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

      {/* Sale Modal (Create/Edit) */}
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
          <div className="flex min-h-screen md:items-center justify-center p-0 md:p-4">
            <div
              className="relative w-full flex flex-col md:min-h-0 md:max-w-4xl rounded-lg md:rounded-xl border shadow-2xl my-auto md:my-0 mx-3 md:mx-0"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
                borderWidth: '1px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-3 md:px-5 py-3 md:py-3.5 border-b"
                style={{ borderColor: '#2d3748' }}
              >
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-creed-text-bright">
                    {isEditMode ? 'Edit Sale' : 'New Sale'}
                  </h2>
                  <p className="text-[10px] md:text-xs text-creed-muted mt-0.5">
                    {isEditMode ? 'Update sale details' : 'Record a new product sale'}
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
              <form onSubmit={handleSubmit} className="flex-1 p-3 md:p-5 space-y-3 md:space-y-5 overflow-y-auto md:max-h-[calc(100vh-180px)]">
                {/* Date Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-3.5 h-3.5 text-creed-primary" />
                    <h3 className="text-xs font-semibold text-creed-text uppercase tracking-wide">
                      Sale Information
                    </h3>
                  </div>

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
                </div>

                {/* Products Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-creed-accent" />
                      <h3 className="text-xs font-semibold text-creed-text uppercase tracking-wide">
                        Product Lines
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={addProductRow}
                      disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-white bg-creed-secondary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Line
                    </button>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {productRows.map((row, index) => {
                      const availableStock = getAvailableStock(row.productId);
                      const isStockInsufficient = row.productId && row.quantityBags > availableStock;

                      return (
                        <div
                          key={row.id}
                          className="p-2 md:p-2.5 rounded-md border transition-all hover:border-creed-accent/30"
                          style={{
                            backgroundColor: '#0d1117',
                            borderColor: isStockInsufficient ? '#ef4444' : '#2d3748',
                            borderWidth: '1px',
                          }}
                        >
                          {/* Mobile Layout */}
                          <div className="md:hidden space-y-2">
                            {/* Row header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center bg-creed-accent/15 text-creed-accent font-semibold text-xs">
                                {index + 1}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeProductRow(row.id)}
                                disabled={
                                  productRows.length === 1 ||
                                  isActionLoading(isEditMode ? 'update' : 'create') ||
                                  saveStatus === 'saving'
                                }
                                className="p-1 rounded text-creed-danger hover:bg-creed-danger/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Remove product line"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Product */}
                            <div>
                              <label className="block text-[10px] font-medium text-creed-muted mb-1">
                                Product <span className="text-creed-danger">*</span>
                              </label>
                              <select
                                value={row.productId}
                                onChange={(e) => updateProductRow(row.id, 'productId', e.target.value)}
                                disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                                className="w-full px-2 py-1.5 text-xs rounded border transition-all focus:ring-1 focus:ring-creed-accent focus:border-creed-accent outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text"
                                style={{
                                  backgroundColor: '#0a0e14',
                                  borderColor: '#2d3748',
                                  borderWidth: '1px',
                                }}
                                required
                              >
                                <option value="">Select product</option>
                                {products.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name} (Stock: {product.quantity})
                                  </option>
                                ))}
                              </select>
                              {isStockInsufficient && (
                                <p className="text-[10px] text-creed-danger mt-1">
                                  Insufficient stock (Available: {availableStock})
                                </p>
                              )}
                            </div>

                            {/* Quantity and Price in a row */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-medium text-creed-muted mb-1">
                                  Qty (Bags) <span className="text-creed-danger">*</span>
                                </label>
                                <input
                                  type="number"
                                  value={row.quantityBags || ''}
                                  onChange={(e) =>
                                    updateProductRow(row.id, 'quantityBags', parseFloat(e.target.value) || 0)
                                  }
                                  min="0"
                                  step="1"
                                  placeholder="0"
                                  disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                                  className="w-full px-2 py-1.5 text-xs rounded border transition-all focus:ring-1 focus:ring-creed-accent focus:border-creed-accent outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text text-center"
                                  style={{
                                    backgroundColor: '#0a0e14',
                                    borderColor: '#2d3748',
                                    borderWidth: '1px',
                                  }}
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-medium text-creed-muted mb-1">
                                  Price ($) <span className="text-creed-danger">*</span>
                                </label>
                                <input
                                  type="number"
                                  value={row.sellingPriceUSD || ''}
                                  onChange={(e) =>
                                    updateProductRow(row.id, 'sellingPriceUSD', parseFloat(e.target.value) || 0)
                                  }
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                                  className="w-full px-2 py-1.5 text-xs rounded border transition-all focus:ring-1 focus:ring-creed-accent focus:border-creed-accent outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text text-right"
                                  style={{
                                    backgroundColor: '#0a0e14',
                                    borderColor: '#2d3748',
                                    borderWidth: '1px',
                                  }}
                                  required
                                />
                              </div>
                            </div>

                            {/* Line Total */}
                            <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: '#2d3748' }}>
                              <span className="text-[10px] font-medium text-creed-muted">Line Total</span>
                              <span className="text-sm font-semibold text-creed-accent">
                                ${calculateLineTotal(row.quantityBags, row.sellingPriceUSD).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Desktop Layout */}
                          <div className="hidden md:grid grid-cols-12 gap-2 items-end">
                            {/* Row Number */}
                            <div className="col-span-1 flex items-center justify-center pb-1">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center bg-creed-accent/15 text-creed-accent font-semibold text-xs">
                                {index + 1}
                              </div>
                            </div>

                            {/* Product */}
                            <div className="col-span-5">
                              <label className="block text-[10px] font-medium text-creed-muted mb-1">
                                Product <span className="text-creed-danger">*</span>
                              </label>
                              <select
                                value={row.productId}
                                onChange={(e) => updateProductRow(row.id, 'productId', e.target.value)}
                                disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                                className="w-full px-2 py-1 text-xs rounded border transition-all focus:ring-1 focus:ring-creed-accent focus:border-creed-accent outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text"
                                style={{
                                  backgroundColor: '#0a0e14',
                                  borderColor: '#2d3748',
                                  borderWidth: '1px',
                                }}
                                required
                              >
                                <option value="">Select product</option>
                                {products.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name} (Stock: {product.quantity})
                                  </option>
                                ))}
                              </select>
                              {isStockInsufficient && (
                                <p className="text-[10px] text-creed-danger mt-1">
                                  Insufficient stock (Available: {availableStock})
                                </p>
                              )}
                            </div>

                            {/* Quantity */}
                            <div className="col-span-2">
                              <label className="block text-[10px] font-medium text-creed-muted mb-1">
                                Qty (Bags) <span className="text-creed-danger">*</span>
                              </label>
                              <input
                                type="number"
                                value={row.quantityBags || ''}
                                onChange={(e) =>
                                  updateProductRow(row.id, 'quantityBags', parseFloat(e.target.value) || 0)
                                }
                                min="0"
                                step="1"
                                placeholder="0"
                                disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                                className="w-full px-2 py-1 text-xs rounded border transition-all focus:ring-1 focus:ring-creed-accent focus:border-creed-accent outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text text-center"
                                style={{
                                  backgroundColor: '#0a0e14',
                                  borderColor: '#2d3748',
                                  borderWidth: '1px',
                                }}
                                required
                              />
                            </div>

                            {/* Price */}
                            <div className="col-span-2">
                              <label className="block text-[10px] font-medium text-creed-muted mb-1">
                                Price ($) <span className="text-creed-danger">*</span>
                              </label>
                              <input
                                type="number"
                                value={row.sellingPriceUSD || ''}
                                onChange={(e) =>
                                  updateProductRow(row.id, 'sellingPriceUSD', parseFloat(e.target.value) || 0)
                                }
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                                className="w-full px-2 py-1 text-xs rounded border transition-all focus:ring-1 focus:ring-creed-accent focus:border-creed-accent outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text text-right"
                                style={{
                                  backgroundColor: '#0a0e14',
                                  borderColor: '#2d3748',
                                  borderWidth: '1px',
                                }}
                                required
                              />
                            </div>

                            {/* Line Total */}
                            <div className="col-span-1">
                              <label className="block text-[10px] font-medium text-creed-muted mb-1">Total</label>
                              <div
                                className="px-1.5 py-1 rounded border text-xs text-creed-accent font-semibold text-center"
                                style={{
                                  backgroundColor: '#0a0e14',
                                  borderColor: '#00d9ff',
                                  borderWidth: '1px',
                                }}
                              >
                                ${calculateLineTotal(row.quantityBags, row.sellingPriceUSD).toFixed(2)}
                              </div>
                            </div>

                            {/* Remove Button */}
                            <div className="col-span-1 flex justify-center pb-1">
                              <button
                                type="button"
                                onClick={() => removeProductRow(row.id)}
                                disabled={
                                  productRows.length === 1 ||
                                  isActionLoading(isEditMode ? 'update' : 'create') ||
                                  saveStatus === 'saving'
                                }
                                className="p-1 rounded text-creed-danger hover:bg-creed-danger/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Remove product line"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-3.5 h-3.5 text-creed-primary" />
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
                      Total Sale Amount
                    </div>
                    <div className="text-lg font-bold text-creed-accent">
                      ${calculateTotalAmount().toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 pt-3 border-t" style={{ borderColor: '#2d3748' }}>
                  <button
                    type="submit"
                    disabled={
                      !isFormValid() ||
                      isActionLoading(isEditMode ? 'update' : 'create') ||
                      saveStatus === 'saving' ||
                      productRows.some((row) => row.productId && row.quantityBags > getAvailableStock(row.productId))
                    }
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 rounded-md font-semibold text-sm text-white bg-creed-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {isActionLoading(isEditMode ? 'update' : 'create') ? (
                      <>
                        <Spinner size="sm" />
                        {isEditMode ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        {isEditMode ? 'Update Sale' : 'Create Sale'}
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
                    className="px-4 py-2.5 md:py-2 rounded-md font-semibold text-sm text-creed-muted hover:text-creed-text hover:bg-creed-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
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
        onConfirm={handleDeleteSale}
        title="Delete Sale"
        message={
          <>
            Are you sure you want to delete this sale from{' '}
            <strong className="text-creed-text-bright">
              {deleteConfirm ? formatDate(deleteConfirm.date) : ''}
            </strong>
            ?
            <br />
            <span className="text-creed-muted text-xs mt-1 block">
              This action cannot be undone. Product stock will be restored.
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

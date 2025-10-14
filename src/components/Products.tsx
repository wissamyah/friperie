import { useState, useMemo } from 'react';
import { Plus, Trash2, Package, Edit2, TrendingUp, DollarSign } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useSaveStatusContext } from '../contexts/SaveStatusContext';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import Spinner from './Spinner';
import PageLoader from './PageLoader';

export default function Products() {
  const {
    products,
    loading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    isActionLoading,
  } = useProducts();

  const { status: saveStatus } = useSaveStatusContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{ id: string; name: string } | null>(null);
  const [productName, setProductName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const isEditMode = !!editingProduct;

  // Calculate stock statistics
  const stockStats = useMemo(() => {
    const totalQuantity = products.reduce((sum, product) => sum + (product.quantity || 0), 0);
    const totalValue = products.reduce((sum, product) => {
      const quantity = product.quantity || 0;
      const cost = product.costPerBagUSD || 0;
      return sum + (quantity * cost);
    }, 0);

    return { totalQuantity, totalValue };
  }, [products]);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setProductName('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: { id: string; name: string }) => {
    setEditingProduct(product);
    setProductName(product.name);
    setIsModalOpen(true);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productName.trim()) return;

    let result;

    if (isEditMode) {
      // Update existing product
      result = await updateProduct(editingProduct.id, { name: productName.trim() });
    } else {
      // Create new product
      result = await createProduct(productName.trim());
    }

    // Only close modal and clear form after successful save
    if (result.success) {
      setProductName('');
      setEditingProduct(null);
      setIsModalOpen(false);
    } else {
      alert(`Failed to ${isEditMode ? 'update' : 'create'} product: ${result.error}`);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteConfirm) return;

    const result = await deleteProduct(deleteConfirm.id);

    if (result.success) {
      setDeleteConfirm(null);
    } else {
      alert(`Failed to delete product: ${result.error}`);
    }
  };

  if (loading) {
    return (
      <PageLoader
        title="Loading Products"
        message="Fetching your product inventory"
        icon={
          <div className="p-4 rounded-xl border-2 border-creed-primary/20" style={{
            backgroundColor: '#151a21'
          }}>
            <Package className="w-12 h-12 text-creed-primary" />
          </div>
        }
      />
    );
  }

  if (error) {
    return (
      <div className="backdrop-blur-sm rounded-lg p-6 border" style={{
        backgroundColor: '#1a2129',
        borderColor: '#ef4444',
        borderWidth: '1px'
      }}>
        <p className="text-creed-danger">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-creed-text-bright mb-1">Products</h1>
          <p className="text-creed-muted">Manage your product inventory</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          disabled={isActionLoading('create') || saveStatus === 'saving'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
          style={{
            backgroundColor: '#0c4a6e',
            borderColor: '#0284c7',
            color: '#fff'
          }}
        >
          <Plus className="w-5 h-5" />
          <span className="hidden md:inline">Add Product</span>
        </button>
      </div>

      {/* Stock Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Stock Quantity Card */}
        <div className="backdrop-blur-sm rounded-lg border shadow-card p-6" style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px'
        }}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-creed-muted mb-1">Total Stock Quantity</p>
              <p className="text-3xl font-bold text-creed-text-bright">
                {stockStats.totalQuantity.toLocaleString()}
                <span className="text-base font-normal text-creed-muted ml-2">bags</span>
              </p>
            </div>
            <div className="p-3 rounded-xl border-2" style={{
              backgroundColor: '#151a21',
              borderColor: '#0284c7'
            }}>
              <TrendingUp className="w-8 h-8" style={{ color: '#0284c7' }} />
            </div>
          </div>
        </div>

        {/* Total Stock Value Card */}
        <div className="backdrop-blur-sm rounded-lg border shadow-card p-6" style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px'
        }}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-creed-muted mb-1">Total Stock Value</p>
              <p className="text-3xl font-bold text-creed-accent">
                ${stockStats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-xl border-2" style={{
              backgroundColor: '#151a21',
              borderColor: '#10b981'
            }}>
              <DollarSign className="w-8 h-8" style={{ color: '#10b981' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="backdrop-blur-sm rounded-lg border shadow-card" style={{
        backgroundColor: '#1a2129',
        borderColor: '#2d3748',
        borderWidth: '1px'
      }}>
        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
              backgroundColor: '#151a21',
              borderColor: '#2d3748',
              borderWidth: '1px'
            }}>
              <Package className="w-8 h-8 text-creed-muted" />
            </div>
            <h3 className="text-lg font-semibold text-creed-text mb-2">No products yet</h3>
            <p className="text-creed-muted">Get started by creating your first product</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#2d3748' }}>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-creed-text">Product Name</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Stock Quantity</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Avg Cost</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b transition-colors hover:bg-creed-primary/5"
                    style={{
                      borderColor: '#2d3748',
                      opacity: isActionLoading('delete', product.id) ? 0.5 : 1
                    }}
                  >
                    <td className="px-4 py-2 text-creed-text text-sm">{product.name}</td>
                    <td className="px-4 py-2 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-creed-text">
                        {product.quantity || 0}
                        <span className="text-[10px] text-creed-muted">bags</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-creed-accent">
                        ${(product.costPerBagUSD || 0).toFixed(2)}
                        <span className="text-[10px] text-creed-muted">/bag</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal({ id: product.id, name: product.name })}
                          disabled={isActionLoading('update', product.id) || saveStatus === 'saving'}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-creed-accent hover:bg-creed-accent/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Edit product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ id: product.id, name: product.name })}
                          disabled={isActionLoading('delete', product.id) || saveStatus === 'saving'}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-creed-danger hover:bg-creed-danger/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete product"
                        >
                          {isActionLoading('delete', product.id) ? (
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
      </div>

      {/* Product Modal (Create/Edit) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          // Prevent closing during save
          const actionType = isEditMode ? 'update' : 'create';
          if (isActionLoading(actionType) || saveStatus === 'saving') return;
          setIsModalOpen(false);
          setProductName('');
          setEditingProduct(null);
        }}
        title={isEditMode ? 'Edit Product' : 'Add New Product'}
      >
        <form onSubmit={handleSubmitProduct} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-creed-text mb-2">
              Product Name
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter product name"
              disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
              className="w-full px-4 py-2 rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text placeholder-creed-muted"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
                borderWidth: '1px'
              }}
              autoFocus
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!productName.trim() || isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all border disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
              style={{
                backgroundColor: '#0c4a6e',
                borderColor: '#0284c7',
                color: '#fff'
              }}
            >
              {isActionLoading(isEditMode ? 'update' : 'create') ? (
                <>
                  <Spinner size="sm" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Product' : 'Create Product'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setProductName('');
                setEditingProduct(null);
              }}
              disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
              className="px-4 py-2 rounded-lg font-semibold text-creed-text hover:bg-creed-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => {
          // Prevent closing during deletion
          if (isActionLoading('delete', deleteConfirm?.id || '')) return;
          setDeleteConfirm(null);
        }}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message={
          <>
            Are you sure you want to delete <strong className="text-creed-text-bright">"{deleteConfirm?.name}"</strong>?
            <br />
            <span className="text-creed-muted text-xs mt-1 block">This action cannot be undone.</span>
          </>
        }
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isActionLoading('delete', deleteConfirm?.id || '')}
      />
    </div>
  );
}

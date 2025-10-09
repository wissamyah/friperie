import { useState, useMemo } from 'react';
import { Plus, Trash2, Truck, Edit2, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';
import { useSuppliers } from '../hooks/useSuppliers';
import { useSupplierLedger } from '../hooks/useSupplierLedger';
import { useSaveStatusContext } from '../contexts/SaveStatusContext';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import Spinner from './Spinner';
import PageLoader from './PageLoader';

interface SuppliersProps {
  onNavigateToLedger?: (supplierId: string) => void;
}

export default function Suppliers({ onNavigateToLedger }: SuppliersProps) {
  const {
    suppliers,
    loading,
    error,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    isActionLoading,
  } = useSuppliers();

  const { getLedgerEntriesBySupplierId } = useSupplierLedger();
  const { status: saveStatus } = useSaveStatusContext();

  // Calculate running balance for each supplier by recalculating chronologically
  const supplierBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    suppliers.forEach(supplier => {
      const entries = getLedgerEntriesBySupplierId(supplier.id);
      if (entries.length > 0) {
        // Sort chronologically (oldest first) by date for accurate balance calculation
        const chronologicalEntries = [...entries].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          // If dates are equal, use createdAt as tiebreaker
          if (dateA === dateB) {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }
          return dateA - dateB;
        });

        // Recalculate running balance chronologically
        let runningBalance = 0;
        chronologicalEntries.forEach(entry => {
          runningBalance += entry.amount;
        });

        balances[supplier.id] = runningBalance;
      } else {
        balances[supplier.id] = 0;
      }
    });
    return balances;
  }, [suppliers, getLedgerEntriesBySupplierId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<{ id: string; name: string } | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const isEditMode = !!editingSupplier;

  const handleOpenCreateModal = () => {
    setEditingSupplier(null);
    setSupplierName('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (supplier: { id: string; name: string }) => {
    setEditingSupplier(supplier);
    setSupplierName(supplier.name);
    setIsModalOpen(true);
  };

  const handleSubmitSupplier = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierName.trim()) return;

    let result;

    if (isEditMode) {
      // Update existing supplier
      result = await updateSupplier(editingSupplier.id, { name: supplierName.trim() });
    } else {
      // Create new supplier
      result = await createSupplier(supplierName.trim());
    }

    // Only close modal and clear form after successful save
    if (result.success) {
      setSupplierName('');
      setEditingSupplier(null);
      setIsModalOpen(false);
    } else {
      alert(`Failed to ${isEditMode ? 'update' : 'create'} supplier: ${result.error}`);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!deleteConfirm) return;

    const result = await deleteSupplier(deleteConfirm.id);

    if (result.success) {
      setDeleteConfirm(null);
    } else {
      alert(`Failed to delete supplier: ${result.error}`);
    }
  };

  if (loading) {
    return (
      <PageLoader
        title="Loading Suppliers"
        message="Fetching your supplier list"
        icon={
          <div className="p-4 rounded-xl border-2 border-creed-primary/20" style={{
            backgroundColor: '#151a21'
          }}>
            <Truck className="w-12 h-12 text-creed-primary" />
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
          <h1 className="text-2xl font-bold text-creed-text-bright mb-1">Suppliers</h1>
          <p className="text-creed-muted">Manage your suppliers</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          disabled={isActionLoading('create') || saveStatus === 'saving'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-creed-primary hover:opacity-90 transition-all shadow-button-3d disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden md:inline">Add Supplier</span>
        </button>
      </div>

      {/* Suppliers Table */}
      <div className="backdrop-blur-sm rounded-lg border shadow-card" style={{
        backgroundColor: '#1a2129',
        borderColor: '#2d3748',
        borderWidth: '1px'
      }}>
        {suppliers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
              backgroundColor: '#151a21',
              borderColor: '#2d3748',
              borderWidth: '1px'
            }}>
              <Truck className="w-8 h-8 text-creed-muted" />
            </div>
            <h3 className="text-lg font-semibold text-creed-text mb-2">No suppliers yet</h3>
            <p className="text-creed-muted">Get started by creating your first supplier</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#2d3748' }}>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-creed-text">Supplier Name</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Running Balance</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="border-b transition-colors hover:bg-creed-primary/5"
                    style={{
                      borderColor: '#2d3748',
                      opacity: isActionLoading('delete', supplier.id) ? 0.5 : 1
                    }}
                  >
                    <td className="px-4 py-2 text-creed-text text-sm">{supplier.name}</td>
                    <td className="px-4 py-2 text-right">
                      {(() => {
                        const balance = supplierBalances[supplier.id] || 0;
                        return (
                          <div className="flex items-center justify-end gap-1.5">
                            {balance < 0 ? (
                              <>
                                <TrendingDown className="w-3.5 h-3.5 text-creed-danger" />
                                <span className="text-xs font-medium text-creed-danger">
                                  €{Math.abs(balance).toFixed(2)}
                                </span>
                              </>
                            ) : balance > 0 ? (
                              <>
                                <TrendingUp className="w-3.5 h-3.5 text-creed-success" />
                                <span className="text-xs font-medium text-creed-success">
                                  €{balance.toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs font-medium text-creed-muted">€0.00</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onNavigateToLedger?.(supplier.id)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-creed-primary hover:bg-creed-primary/10 transition-all"
                          title="View ledger"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal({ id: supplier.id, name: supplier.name })}
                          disabled={isActionLoading('update', supplier.id) || saveStatus === 'saving'}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-creed-accent hover:bg-creed-accent/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Edit supplier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ id: supplier.id, name: supplier.name })}
                          disabled={isActionLoading('delete', supplier.id) || saveStatus === 'saving'}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-creed-danger hover:bg-creed-danger/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete supplier"
                        >
                          {isActionLoading('delete', supplier.id) ? (
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

      {/* Supplier Modal (Create/Edit) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          // Prevent closing during save
          const actionType = isEditMode ? 'update' : 'create';
          if (isActionLoading(actionType) || saveStatus === 'saving') return;
          setIsModalOpen(false);
          setSupplierName('');
          setEditingSupplier(null);
        }}
        title={isEditMode ? 'Edit Supplier' : 'Add New Supplier'}
      >
        <form onSubmit={handleSubmitSupplier} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-creed-text mb-2">
              Supplier Name
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Enter supplier name"
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
              disabled={!supplierName.trim() || isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-creed-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-button-3d"
            >
              {isActionLoading(isEditMode ? 'update' : 'create') ? (
                <>
                  <Spinner size="sm" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Supplier' : 'Create Supplier'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setSupplierName('');
                setEditingSupplier(null);
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
        onConfirm={handleDeleteSupplier}
        title="Delete Supplier"
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

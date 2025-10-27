import { useState } from 'react';
import { Plus, Trash2, DollarSign, Edit2, ArrowRightLeft } from 'lucide-react';
import { usePayments } from '../hooks/usePayments';
import { useSuppliers } from '../hooks/useSuppliers';
import { useSaveStatusContext } from '../contexts/SaveStatusContext';
import { githubDataManager } from '../services/githubDataManager';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import Spinner from './Spinner';
import PageLoader from './PageLoader';
import { formatDate } from '../utils/dateFormatter';

export default function Payments() {
  const {
    payments,
    loading,
    error,
    createPayment,
    updatePayment,
    deletePayment,
    isActionLoading,
    calculateAmountUSD,
  } = usePayments();

  const { suppliers } = useSuppliers();
  const { status: saveStatus } = useSaveStatusContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<{ id: string; originalSupplierId: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; supplierName: string } | null>(null);

  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState('');
  const [amountEUR, setAmountEUR] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [commissionPercent, setCommissionPercent] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const isEditMode = !!editingPayment;

  const resetForm = () => {
    setSupplierId('');
    setDate('');
    setAmountEUR(0);
    setExchangeRate(0);
    setCommissionPercent('');
    setNotes('');
    setEditingPayment(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (payment: any) => {
    setEditingPayment({ id: payment.id, originalSupplierId: payment.supplierId });
    setSupplierId(payment.supplierId);
    setDate(payment.date);
    setAmountEUR(payment.amountEUR);
    setExchangeRate(payment.exchangeRate);
    setCommissionPercent(payment.commissionPercent);
    setNotes(payment.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) {
      alert('Please select a supplier');
      return;
    }

    try {
      if (isEditMode) {
        // UPDATE MODE - update payment record, ledger entry, and cash transaction
        githubDataManager.startBatchUpdate();

        // Detect if supplier changed
        const supplierChanged = editingPayment.originalSupplierId !== supplierId;

        // Update the payment record with new supplier info
        const result = await updatePayment(editingPayment.id, {
          supplierId,
          supplierName: supplier.name,
          date,
          amountEUR,
          exchangeRate,
          commissionPercent: commissionPercent === '' ? 0 : commissionPercent,
          notes,
        });

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to update payment');
        }

        // Handle ledger entries directly using githubDataManager to avoid stale data issues
        const currentLedgerEntries = githubDataManager.getData('supplierLedger') || [];
        const ledgerEntry = currentLedgerEntries.find(
          (entry: any) => entry.relatedPaymentId === editingPayment.id
        );

        if (ledgerEntry) {
          if (supplierChanged) {
            // Supplier changed: remove old ledger entry from original supplier and create new one for new supplier
            console.log(`🔄 Supplier changed from ${editingPayment.originalSupplierId} to ${supplierId}`);
            console.log(`📝 Removing ledger entry ${ledgerEntry.id} from original supplier`);

            // Remove the old ledger entry
            let updatedLedgerEntries = currentLedgerEntries.filter((e: any) => e.id !== ledgerEntry.id);

            // Recalculate balances for the ORIGINAL supplier (after removing the entry)
            const originalSupplierEntries = updatedLedgerEntries
              .filter((e: any) => e.supplierId === editingPayment.originalSupplierId)
              .sort((a: any, b: any) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateA === dateB) {
                  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                }
                return dateA - dateB;
              });

            let runningBalance = 0;
            const recalculatedOriginalEntries = originalSupplierEntries.map((entry: any) => {
              runningBalance += entry.amount;
              return { ...entry, balance: runningBalance };
            });

            // Replace original supplier entries with recalculated ones
            updatedLedgerEntries = [
              ...updatedLedgerEntries.filter((e: any) => e.supplierId !== editingPayment.originalSupplierId),
              ...recalculatedOriginalEntries
            ];

            // Create new ledger entry for the NEW supplier
            const newLedgerEntry = {
              id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              supplierId,
              supplierName: supplier.name,
              type: 'payment' as const,
              amount: Math.abs(amountEUR), // Positive for payment (credit)
              balance: 0, // Will be recalculated
              description: `Payment received - ${notes || 'No notes'}`,
              relatedPaymentId: editingPayment.id,
              date,
              createdAt: new Date().toISOString(),
            };

            console.log(`✅ Creating new ledger entry ${newLedgerEntry.id} for new supplier ${supplierId}`);

            // Add new entry
            updatedLedgerEntries.push(newLedgerEntry);

            // Recalculate balances for the NEW supplier (with the new entry)
            const newSupplierEntries = updatedLedgerEntries
              .filter((e: any) => e.supplierId === supplierId)
              .sort((a: any, b: any) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateA === dateB) {
                  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                }
                return dateA - dateB;
              });

            runningBalance = 0;
            const recalculatedNewEntries = newSupplierEntries.map((entry: any) => {
              runningBalance += entry.amount;
              return { ...entry, balance: runningBalance };
            });

            // Replace new supplier entries with recalculated ones
            updatedLedgerEntries = [
              ...updatedLedgerEntries.filter((e: any) => e.supplierId !== supplierId),
              ...recalculatedNewEntries
            ];

            console.log(`💾 Saving updated ledger with ${updatedLedgerEntries.length} entries`);
            await githubDataManager.updateData('supplierLedger', updatedLedgerEntries);
          } else {
            // Same supplier: just update the ledger entry amount, description, and date
            const updatedEntry = {
              ...ledgerEntry,
              amount: Math.abs(amountEUR),
              description: `Payment received - ${notes || 'No notes'}`,
              date,
            };

            // Replace the old entry with updated one
            let updatedLedgerEntries = currentLedgerEntries.map((e: any) =>
              e.id === ledgerEntry.id ? updatedEntry : e
            );

            // Recalculate balances for this supplier
            const supplierEntries = updatedLedgerEntries
              .filter((e: any) => e.supplierId === supplierId)
              .sort((a: any, b: any) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateA === dateB) {
                  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                }
                return dateA - dateB;
              });

            let runningBalance = 0;
            const recalculatedEntries = supplierEntries.map((entry: any) => {
              runningBalance += entry.amount;
              return { ...entry, balance: runningBalance };
            });

            // Replace supplier entries with recalculated ones
            updatedLedgerEntries = [
              ...updatedLedgerEntries.filter((e: any) => e.supplierId !== supplierId),
              ...recalculatedEntries
            ];

            await githubDataManager.updateData('supplierLedger', updatedLedgerEntries);
          }
        }

        // Update the related cash transaction
        const currentCashTransactions = githubDataManager.getData('cashTransactions') || [];
        const relatedTransaction = currentCashTransactions.find(
          (t: any) => t.relatedPaymentId === editingPayment.id
        );

        if (relatedTransaction) {
          // Calculate balance for the updated transaction based on chronological position
          const calculateBalanceForUpdate = (amount: number, txDate: string, txCreatedAt: string, txId: string, allTransactions: any[]) => {
            const transactionsBeforeThis = allTransactions.filter((t: any) => {
              if (t.id === txId) return false;
              const newDateTime = new Date(txDate).getTime();
              const tDateTime = new Date(t.date).getTime();
              if (tDateTime < newDateTime) return true;
              if (tDateTime === newDateTime) {
                return new Date(t.createdAt).getTime() < new Date(txCreatedAt).getTime();
              }
              return false;
            });
            return transactionsBeforeThis.reduce((sum: number, t: any) => sum + t.amount, 0) + amount;
          };

          const updatedCashTransaction = {
            ...relatedTransaction,
            date,
            amount: -result.data.amountUSD, // Negative because cash is going out
            balance: calculateBalanceForUpdate(
              -result.data.amountUSD,
              date,
              relatedTransaction.createdAt,
              relatedTransaction.id,
              currentCashTransactions
            ),
            description: `Payment to ${supplier.name}${notes ? ` - ${notes}` : ''}`,
          };

          await githubDataManager.updateData('cashTransactions',
            currentCashTransactions.map((t: any) => t.id === relatedTransaction.id ? updatedCashTransaction : t)
          );
        }

        await githubDataManager.endBatchUpdate();
      } else {
        // CREATE MODE - create payment, ledger entry, and cash transaction in a batch
        githubDataManager.startBatchUpdate();

        // Create the payment record
        const paymentResult = await createPayment(
          supplierId,
          supplier.name,
          date,
          amountEUR,
          exchangeRate,
          commissionPercent === '' ? 0 : commissionPercent,
          notes
        );

        if (!paymentResult.success || !paymentResult.data) {
          throw new Error(paymentResult.error || 'Failed to create payment');
        }

        // Create ledger entry for the payment (credit) directly using githubDataManager
        const currentLedgerEntries = githubDataManager.getData('supplierLedger') || [];
        const newLedgerEntry = {
          id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          supplierId,
          supplierName: supplier.name,
          type: 'payment' as const,
          amount: Math.abs(amountEUR), // Positive for payment (credit)
          balance: 0, // Will be recalculated
          description: `Payment received - ${notes || 'No notes'}`,
          relatedPaymentId: paymentResult.data.id,
          date,
          createdAt: new Date().toISOString(),
        };

        // Add new entry
        const updatedLedgerEntries = [...currentLedgerEntries, newLedgerEntry];

        // Recalculate balances for this supplier
        const supplierEntries = updatedLedgerEntries
          .filter((e: any) => e.supplierId === supplierId)
          .sort((a: any, b: any) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA === dateB) {
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }
            return dateA - dateB;
          });

        let runningBalance = 0;
        const recalculatedEntries = supplierEntries.map((entry: any) => {
          runningBalance += entry.amount;
          return { ...entry, balance: runningBalance };
        });

        // Replace supplier entries with recalculated ones
        const finalLedgerEntries = [
          ...updatedLedgerEntries.filter((e: any) => e.supplierId !== supplierId),
          ...recalculatedEntries
        ];

        await githubDataManager.updateData('supplierLedger', finalLedgerEntries);

        // Create cash transaction to record the payment outflow
        const currentCashTransactions = githubDataManager.getData('cashTransactions') || [];
        const timestamp = new Date().toISOString();

        // Calculate balance for the new cash transaction
        const calculateBalance = (amount: number, existingTransactions: any[]) => {
          return existingTransactions.reduce((sum, t) => sum + t.amount, 0) + amount;
        };

        const newCashTransaction = {
          id: `cash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date,
          type: 'payment' as const,
          amount: -paymentResult.data.amountUSD, // Negative because cash is going out
          balance: calculateBalance(-paymentResult.data.amountUSD, currentCashTransactions),
          description: `Payment to ${supplier.name}${notes ? ` - ${notes}` : ''}`,
          relatedPaymentId: paymentResult.data.id,
          createdAt: timestamp,
        };

        await githubDataManager.updateData('cashTransactions', [...currentCashTransactions, newCashTransaction]);

        await githubDataManager.endBatchUpdate();
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      alert(`Failed to ${isEditMode ? 'update' : 'create'} payment: ${error.message}`);
    }
  };

  const handleDeletePayment = async () => {
    if (!deleteConfirm) return;

    const result = await deletePayment(deleteConfirm.id);

    if (result.success) {
      setDeleteConfirm(null);
    } else {
      alert(`Failed to delete payment: ${result.error}`);
    }
  };

  const calculatedUSD = amountEUR && exchangeRate
    ? calculateAmountUSD(amountEUR, exchangeRate, commissionPercent === '' ? 0 : commissionPercent)
    : 0;

  if (loading) {
    return (
      <PageLoader
        title="Loading Payments"
        message="Fetching payment records"
        icon={
          <div className="p-4 rounded-xl border-2 border-creed-primary/20" style={{
            backgroundColor: '#151a21'
          }}>
            <DollarSign className="w-12 h-12 text-creed-primary" />
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
          <h1 className="text-2xl font-bold text-creed-text-bright mb-1">Payments</h1>
          <p className="text-creed-muted">Record and manage supplier payments</p>
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
          <span className="hidden md:inline">Add Payment</span>
        </button>
      </div>

      {/* Payments Table */}
      <div className="backdrop-blur-sm rounded-lg border shadow-card" style={{
        backgroundColor: '#1a2129',
        borderColor: '#2d3748',
        borderWidth: '1px'
      }}>
        {payments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
              backgroundColor: '#151a21',
              borderColor: '#2d3748',
              borderWidth: '1px'
            }}>
              <DollarSign className="w-8 h-8 text-creed-muted" />
            </div>
            <h3 className="text-lg font-semibold text-creed-text mb-2">No payments yet</h3>
            <p className="text-creed-muted">Get started by recording your first payment</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#2d3748' }}>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-creed-text">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-creed-text">Supplier</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Amount EUR</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Exchange Rate</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Commission</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Amount USD</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Unallocated</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b transition-colors hover:bg-creed-primary/5"
                    style={{
                      borderColor: '#2d3748',
                      opacity: isActionLoading('delete', payment.id) ? 0.5 : 1
                    }}
                  >
                    <td className="px-4 py-2 text-creed-muted text-xs">
                      {formatDate(payment.date)}
                    </td>
                    <td className="px-4 py-2 text-creed-text text-sm">{payment.supplierName}</td>
                    <td className="px-4 py-2 text-right">
                      <span className="text-sm font-medium text-creed-text">
                        €{payment.amountEUR.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-creed-muted">{payment.exchangeRate.toFixed(4)}</span>
                        <ArrowRightLeft className="w-3 h-3 text-creed-muted" />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className="text-xs text-creed-muted">{payment.commissionPercent.toFixed(2)}%</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className="text-sm font-semibold text-creed-accent">
                        ${payment.amountUSD.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {payment.unallocatedEUR > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-creed-primary/10 text-creed-primary">
                          €{payment.unallocatedEUR.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs text-creed-muted">Fully allocated</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(payment)}
                          disabled={isActionLoading('update', payment.id) || saveStatus === 'saving'}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-creed-accent hover:bg-creed-accent/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Edit payment"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ id: payment.id, supplierName: payment.supplierName })}
                          disabled={isActionLoading('delete', payment.id) || saveStatus === 'saving'}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-creed-danger hover:bg-creed-danger/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete payment"
                        >
                          {isActionLoading('delete', payment.id) ? (
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

      {/* Payment Modal (Create/Edit) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving') return;
          setIsModalOpen(false);
          resetForm();
        }}
        title={isEditMode ? 'Edit Payment' : 'Add New Payment'}
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-creed-text mb-2">
                Supplier <span className="text-creed-danger">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text"
                style={{
                  backgroundColor: '#151a21',
                  borderColor: '#2d3748',
                  borderWidth: '1px'
                }}
                required
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-creed-text mb-2">
                Date <span className="text-creed-danger">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text"
                style={{
                  backgroundColor: '#151a21',
                  borderColor: '#2d3748',
                  borderWidth: '1px'
                }}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-creed-text mb-2">
              Amount (EUR) <span className="text-creed-danger">*</span>
            </label>
            <input
              type="number"
              value={amountEUR || ''}
              onChange={(e) => setAmountEUR(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              placeholder="0.00"
              disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
              className="w-full px-4 py-2 rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text placeholder-creed-muted"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
                borderWidth: '1px'
              }}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-creed-text mb-2">
                Exchange Rate (USD/EUR) <span className="text-creed-danger">*</span>
              </label>
              <input
                type="number"
                value={exchangeRate || ''}
                onChange={(e) => setExchangeRate(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                min="0"
                step="any"
                placeholder="1.1000"
                disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text placeholder-creed-muted"
                style={{
                  backgroundColor: '#151a21',
                  borderColor: '#2d3748',
                  borderWidth: '1px'
                }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-creed-text mb-2">
                Commission (%) <span className="text-creed-danger">*</span>
              </label>
              <input
                type="number"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(e.target.value === '' ? '' : parseFloat(e.target.value))}
                min="0"
                step="0.01"
                placeholder="0.00"
                disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                className="w-full px-4 py-2 rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text placeholder-creed-muted"
                style={{
                  backgroundColor: '#151a21',
                  borderColor: '#2d3748',
                  borderWidth: '1px'
                }}
                required
              />
            </div>
          </div>

          {/* Calculated USD */}
          <div className="p-4 rounded-lg border" style={{
            backgroundColor: '#0d1117',
            borderColor: '#00d9ff',
            borderWidth: '1px'
          }}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-creed-muted">Amount in USD:</span>
              <span className="text-lg font-bold text-creed-accent">
                ${calculatedUSD.toFixed(2)}
              </span>
            </div>
            {amountEUR > 0 && exchangeRate > 0 && (
              <p className="text-xs text-creed-muted mt-1">
                €{amountEUR.toFixed(2)} × {exchangeRate.toFixed(4)} × (1 + {(commissionPercent === '' ? 0 : commissionPercent).toFixed(2)}%)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-creed-text mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this payment..."
              rows={3}
              disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
              className="w-full px-4 py-2 rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text placeholder-creed-muted resize-none"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
                borderWidth: '1px'
              }}
            />
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!supplierId || !date || !amountEUR || !exchangeRate || isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 rounded-lg font-semibold transition-all border disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md active:scale-95"
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
                isEditMode ? 'Update Payment' : 'Create Payment'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
              className="px-4 py-2.5 md:py-2 rounded-lg font-semibold text-creed-text hover:bg-creed-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
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
          if (isActionLoading('delete', deleteConfirm?.id || '')) return;
          setDeleteConfirm(null);
        }}
        onConfirm={handleDeletePayment}
        title="Delete Payment"
        message={
          <>
            Are you sure you want to delete this payment to <strong className="text-creed-text-bright">"{deleteConfirm?.supplierName}"</strong>?
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

import { useState } from 'react';
import { Settings as SettingsIcon, Trash2, AlertTriangle, Package, Truck, Container, BookOpen, DollarSign, ShoppingCart, Receipt, Wallet } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useSuppliers } from '../hooks/useSuppliers';
import { useContainers } from '../hooks/useContainers';
import { useSupplierLedger } from '../hooks/useSupplierLedger';
import { usePayments } from '../hooks/usePayments';
import { useSales } from '../hooks/useSales';
import { useExpenses } from '../hooks/useExpenses';
import { useCashSituation } from '../hooks/useCashSituation';
import { useSaveStatusContext } from '../contexts/SaveStatusContext';
import ConfirmModal from './ConfirmModal';
import Spinner from './Spinner';

interface DataTypeOption {
  id: keyof DataSelectionState;
  name: string;
  icon: any;
  description: string;
  count?: number;
}

interface DataSelectionState {
  products: boolean;
  suppliers: boolean;
  containers: boolean;
  payments: boolean;
  supplierLedger: boolean;
  sales: boolean;
  expenses: boolean;
  cashTransactions: boolean;
}

export default function Settings() {
  const { products, updateProduct } = useProducts();
  const { suppliers, updateSupplier } = useSuppliers();
  const { containers } = useContainers();
  const { payments } = usePayments();
  const { ledgerEntries } = useSupplierLedger();
  const { sales } = useSales();
  const { expenses } = useExpenses();
  const { cashTransactions } = useCashSituation();
  const { status: saveStatus } = useSaveStatusContext();

  const [selectedData, setSelectedData] = useState<DataSelectionState>({
    products: false,
    suppliers: false,
    containers: false,
    payments: false,
    supplierLedger: false,
    sales: false,
    expenses: false,
    cashTransactions: false,
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const dataTypes: DataTypeOption[] = [
    {
      id: 'products',
      name: 'Products',
      icon: Package,
      description: 'All product data including stock quantities and costs',
      count: products.length,
    },
    {
      id: 'suppliers',
      name: 'Suppliers',
      icon: Truck,
      description: 'Supplier information and balances',
      count: suppliers.length,
    },
    {
      id: 'containers',
      name: 'Containers',
      icon: Container,
      description: 'All container shipment records',
      count: containers.length,
    },
    {
      id: 'payments',
      name: 'Payments',
      icon: DollarSign,
      description: 'All payment records and allocations',
      count: payments.length,
    },
    {
      id: 'sales',
      name: 'Sales',
      icon: ShoppingCart,
      description: 'All sales transactions and revenue records',
      count: sales.length,
    },
    {
      id: 'expenses',
      name: 'Expenses',
      icon: Receipt,
      description: 'All expense records and payments',
      count: expenses.length,
    },
    {
      id: 'cashTransactions',
      name: 'Cash Transactions',
      icon: Wallet,
      description: 'All cash flow transactions and balances',
      count: cashTransactions.length,
    },
    {
      id: 'supplierLedger',
      name: 'Supplier Ledger',
      icon: BookOpen,
      description: 'All ledger entries and transaction history',
      count: ledgerEntries.length,
    },
  ];

  const toggleDataType = (id: keyof DataSelectionState) => {
    setSelectedData(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    const allSelected = Object.values(selectedData).every(v => v);
    const newState = Object.keys(selectedData).reduce((acc, key) => {
      acc[key as keyof DataSelectionState] = !allSelected;
      return acc;
    }, {} as DataSelectionState);
    setSelectedData(newState);
  };

  const hasSelection = Object.values(selectedData).some(v => v);
  const allSelected = Object.values(selectedData).every(v => v);

  const handleResetData = async () => {
    setIsDeleting(true);

    try {
      const { dataResetService, DataTypeKey } = await import('../services/dataResetService');

      // Get selected data types
      const selectedTypes = (Object.keys(selectedData) as Array<keyof DataSelectionState>)
        .filter(key => selectedData[key]);

      // Reset data using the service
      await dataResetService.resetData({ dataTypes: selectedTypes });

      // Reset selection
      setSelectedData({
        products: false,
        suppliers: false,
        containers: false,
        payments: false,
        supplierLedger: false,
        sales: false,
        expenses: false,
        cashTransactions: false,
      });

      setShowConfirmModal(false);
    } catch (error: any) {
      alert(`Failed to reset data: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getSelectedDataDescription = () => {
    const selected = dataTypes
      .filter(dt => selectedData[dt.id])
      .map(dt => dt.name);

    if (selected.length === 0) return '';
    if (selected.length === 1) return selected[0];
    if (selected.length === 2) return selected.join(' and ');

    const lastItem = selected.pop();
    return `${selected.join(', ')}, and ${lastItem}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-creed-text-bright mb-1">Settings</h1>
          <p className="text-creed-muted">Manage your application data and preferences</p>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="backdrop-blur-sm rounded-lg border shadow-card" style={{
        backgroundColor: '#1a2129',
        borderColor: '#2d3748',
        borderWidth: '1px'
      }}>
        <div className="p-6 border-b" style={{ borderColor: '#2d3748' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-creed-danger/10">
              <Trash2 className="w-5 h-5 text-creed-danger" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-creed-text-bright">Reset Data</h2>
              <p className="text-sm text-creed-muted mt-0.5">
                Permanently delete selected data from your GitHub repository
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-4 rounded-lg border" style={{
            backgroundColor: '#1f1206',
            borderColor: '#d97706',
            borderWidth: '1px'
          }}>
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-yellow-200">Warning: This action is irreversible</h3>
              <p className="text-xs text-yellow-300/80 mt-1">
                Selected data will be permanently deleted from your GitHub repository and cannot be recovered.
              </p>
            </div>
          </div>

          {/* Select All Toggle */}
          <div className="flex items-center justify-between py-2">
            <button
              onClick={toggleAll}
              className="text-sm font-medium text-creed-accent hover:text-creed-accent/80 transition-colors"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            {hasSelection && (
              <span className="text-xs text-creed-muted">
                {Object.values(selectedData).filter(v => v).length} selected
              </span>
            )}
          </div>

          {/* Data Type Selection */}
          <div className="space-y-2">
            {dataTypes.map((dataType) => {
              const Icon = dataType.icon;
              const isSelected = selectedData[dataType.id];

              return (
                <button
                  key={dataType.id}
                  onClick={() => toggleDataType(dataType.id)}
                  disabled={saveStatus === 'saving' || isDeleting}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-creed-danger/10 border-creed-danger'
                      : 'hover:bg-creed-primary/5'
                  }`}
                  style={{
                    borderColor: isSelected ? '' : '#1a1f26',
                    borderWidth: '1px'
                  }}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-creed-danger border-creed-danger'
                      : 'border-creed-muted'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${
                    isSelected ? 'bg-creed-danger/20' : 'bg-creed-primary/10'
                  }`}>
                    <Icon className={`w-4 h-4 ${
                      isSelected ? 'text-creed-danger' : 'text-creed-primary'
                    }`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-creed-text">{dataType.name}</h3>
                      <span className="text-xs text-creed-muted">
                        ({dataType.count} {dataType.count === 1 ? 'item' : 'items'})
                      </span>
                    </div>
                    <p className="text-xs text-creed-muted mt-0.5">{dataType.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Reset Button */}
          <div className="pt-4 border-t" style={{ borderColor: '#2d3748' }}>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={!hasSelection || saveStatus === 'saving' || isDeleting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm text-white bg-creed-danger hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <Spinner size="sm" />
                  Resetting Data...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Reset Selected Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => !isDeleting && setShowConfirmModal(false)}
        onConfirm={handleResetData}
        title="Confirm Data Reset"
        message={
          <>
            Are you absolutely sure you want to permanently delete <strong className="text-creed-danger">{getSelectedDataDescription()}</strong>?
            <br />
            <span className="text-creed-muted text-xs mt-2 block">
              This action cannot be undone. All selected data will be removed from your GitHub repository.
            </span>
          </>
        }
        confirmText="Yes, Delete Permanently"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </div>
  );
}

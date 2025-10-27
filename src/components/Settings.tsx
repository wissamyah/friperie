import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Trash2, AlertTriangle, Package, Truck, Container, BookOpen, DollarSign, ShoppingCart, Receipt, Wallet, FileText, Plus, RefreshCw, Edit2, Check, X, Wrench, Users, ArrowRightLeft } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useSuppliers } from '../hooks/useSuppliers';
import { useContainers } from '../hooks/useContainers';
import { useSupplierLedger } from '../hooks/useSupplierLedger';
import { usePayments } from '../hooks/usePayments';
import { useSales } from '../hooks/useSales';
import { useExpenses } from '../hooks/useExpenses';
import { useCashSituation } from '../hooks/useCashSituation';
import { usePartners } from '../hooks/usePartners';
import { useSaveStatusContext } from '../contexts/SaveStatusContext';
import ConfirmModal from './ConfirmModal';
import Modal from './Modal';
import Spinner from './Spinner';
import StockRecoveryHelper from './StockRecoveryHelper';
import { githubDataManager } from '../services/githubDataManager';
import { dataFileManager, DataFile } from '../services/DataFileManager';

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
  partners: boolean;
  partnerTransactions: boolean;
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
  const { partners, partnerTransactions } = usePartners();
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
    partners: false,
    partnerTransactions: false,
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStockRecovery, setShowStockRecovery] = useState(false);

  // Data file management state
  const [currentDataFile, setCurrentDataFile] = useState<string>('');
  const [availableDataFiles, setAvailableDataFiles] = useState<DataFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isSwitchingFile, setIsSwitchingFile] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [showCreateFileModal, setShowCreateFileModal] = useState(false);
  const [showSwitchFileModal, setShowSwitchFileModal] = useState(false);
  const [fileToSwitchTo, setFileToSwitchTo] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState<string>('');
  const [newFileName, setNewFileName] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Load available data files on mount
  useEffect(() => {
    loadAvailableDataFiles();
    setCurrentDataFile(githubDataManager.getCurrentDataFile());
  }, []);

  const loadAvailableDataFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const files = await githubDataManager.listAvailableDataFiles();
      const dataFiles = dataFileManager.getAvailableDataFiles(files);
      setAvailableDataFiles(dataFiles);
    } catch (error: any) {
      console.error('Failed to load data files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSwitchDataFile = async () => {
    if (!fileToSwitchTo) return;

    setIsSwitchingFile(true);
    try {
      await githubDataManager.switchDataFile(fileToSwitchTo);
      setCurrentDataFile(fileToSwitchTo);
      setShowSwitchFileModal(false);
      setFileToSwitchTo('');

      // Reload page to refresh all data
      window.location.reload();
    } catch (error: any) {
      alert(`Failed to switch data file: ${error.message}`);
    } finally {
      setIsSwitchingFile(false);
    }
  };

  const handleOpenCreateFileModal = () => {
    const defaultName = dataFileManager.getDisplayName(
      dataFileManager.getNextDataFileName(availableDataFiles.map(f => f.name))
    );
    setNewFileName(defaultName);
    setShowCreateFileModal(true);
  };

  const handleCreateNewFile = async () => {
    setIsCreatingFile(true);
    try {
      const nextFileName = dataFileManager.getNextDataFileName(
        availableDataFiles.map(f => f.name)
      );

      await githubDataManager.createNewDataFile(nextFileName);

      // Set custom name if provided
      const trimmedName = newFileName.trim();
      if (trimmedName && trimmedName !== dataFileManager.getDisplayName(nextFileName)) {
        dataFileManager.setCustomDisplayName(nextFileName, trimmedName);
      }

      await loadAvailableDataFiles();
      setCurrentDataFile(nextFileName);
      setShowCreateFileModal(false);
      setNewFileName('');

      // Reload page to refresh all data
      window.location.reload();
    } catch (error: any) {
      alert(`Failed to create new data file: ${error.message}`);
    } finally {
      setIsCreatingFile(false);
    }
  };

  const handleStartEditName = () => {
    setEditedName(dataFileManager.getDisplayName(currentDataFile));
    setIsEditingName(true);
  };

  const handleSaveNewName = () => {
    const trimmedName = editedName.trim();
    if (trimmedName) {
      dataFileManager.setCustomDisplayName(currentDataFile, trimmedName);
      loadAvailableDataFiles(); // Refresh to show new name
      setRefreshKey(prev => prev + 1); // Force re-render to show updated name
    }
    setIsEditingName(false);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

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
    {
      id: 'partners',
      name: 'Partners',
      icon: Users,
      description: 'Partner information and balances',
      count: partners.length,
    },
    {
      id: 'partnerTransactions',
      name: 'Partner Transactions',
      icon: ArrowRightLeft,
      description: 'All partner injections and withdrawals',
      count: partnerTransactions.length,
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
        partners: false,
        partnerTransactions: false,
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

  // Render Stock Recovery Helper if active
  if (showStockRecovery) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <button
          onClick={() => setShowStockRecovery(false)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border hover:shadow-md"
          style={{
            backgroundColor: '#1a2129',
            borderColor: '#2d3748',
            color: '#fff'
          }}
        >
          <X className="w-4 h-4" />
          Back to Settings
        </button>
        <StockRecoveryHelper />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-creed-text-bright mb-1">Settings</h1>
          <p className="text-creed-muted">Manage your application data and preferences</p>
        </div>
      </div>

      {/* Stock Recovery Tool Section */}
      <div className="backdrop-blur-sm rounded-lg border shadow-card" style={{
        backgroundColor: '#1a2129',
        borderColor: '#ef4444',
        borderWidth: '1px'
      }}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl border-2" style={{
              backgroundColor: '#151a21',
              borderColor: '#ef4444'
            }}>
              <Wrench className="w-6 h-6" style={{ color: '#ef4444' }} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-creed-text-bright mb-2">Stock Recovery Helper</h3>
              <p className="text-sm text-creed-muted mb-4">
                Use this tool to identify and fix duplicate stock issues caused by container edits.
                This tool will help you find containers that may have added stock twice and correct them.
              </p>
              <button
                onClick={() => setShowStockRecovery(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border hover:shadow-md"
                style={{
                  backgroundColor: '#7f1d1d',
                  borderColor: '#ef4444',
                  color: '#fff'
                }}
              >
                <Wrench className="w-4 h-4" />
                Open Stock Recovery Tool
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data File Selector Section */}
      <div className="backdrop-blur-sm rounded-lg border shadow-card" style={{
        backgroundColor: '#1a2129',
        borderColor: '#2d3748',
        borderWidth: '1px'
      }}>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Current File Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-creed-primary/10 flex-shrink-0">
                <FileText className="w-4 h-4 text-creed-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveNewName();
                        if (e.key === 'Escape') handleCancelEditName();
                      }}
                      className="px-2 py-1 rounded border text-sm font-semibold bg-creed-base text-creed-text-bright focus:outline-none focus:border-creed-primary"
                      style={{
                        backgroundColor: '#0f1419',
                        borderColor: '#2d3748',
                        minWidth: '150px',
                        maxWidth: '300px'
                      }}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveNewName}
                      className="p-1 rounded hover:bg-creed-primary/10 transition-colors"
                      title="Save name"
                    >
                      <Check className="w-4 h-4 text-creed-success" />
                    </button>
                    <button
                      onClick={handleCancelEditName}
                      className="p-1 rounded hover:bg-creed-danger/10 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4 text-creed-danger" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-creed-text-bright truncate" key={refreshKey}>
                      {dataFileManager.getDisplayName(currentDataFile)}
                    </h2>
                    <button
                      onClick={handleStartEditName}
                      className="p-1 rounded hover:bg-creed-primary/10 transition-colors flex-shrink-0"
                      title="Edit name"
                    >
                      <Edit2 className="w-3 h-3 text-creed-muted hover:text-creed-primary" />
                    </button>
                    <span className="text-xs font-semibold text-creed-primary px-2 py-0.5 rounded-full bg-creed-primary/20 flex-shrink-0">
                      Active
                    </span>
                  </div>
                )}
                <p className="text-xs text-creed-muted mt-0.5">{currentDataFile}</p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Refresh Button */}
              <button
                onClick={loadAvailableDataFiles}
                disabled={isLoadingFiles}
                className="p-2 rounded-lg hover:bg-creed-primary/10 transition-all disabled:opacity-50"
                title="Refresh file list"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-creed-muted ${isLoadingFiles ? 'animate-spin' : ''}`} />
              </button>

              {/* Switch File Dropdown - Only show if there are multiple files */}
              {availableDataFiles.length > 1 && (
                <select
                  value={currentDataFile}
                  onChange={(e) => {
                    const newFile = e.target.value;
                    if (newFile !== currentDataFile && !githubDataManager.hasPendingSaves()) {
                      setFileToSwitchTo(newFile);
                      setShowSwitchFileModal(true);
                    } else if (githubDataManager.hasPendingSaves()) {
                      alert('Please wait for all changes to be saved before switching data files.');
                      e.target.value = currentDataFile; // Reset selection
                    }
                  }}
                  disabled={saveStatus === 'saving'}
                  className="px-3 py-2 rounded-lg border text-sm font-medium bg-creed-base text-creed-text hover:border-creed-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#0f1419',
                    borderColor: '#2d3748',
                  }}
                >
                  {availableDataFiles.map((file) => (
                    <option key={file.name} value={file.name}>
                      {file.displayName}
                    </option>
                  ))}
                </select>
              )}

              {/* Create New File Button */}
              <button
                onClick={handleOpenCreateFileModal}
                disabled={saveStatus === 'saving' || isCreatingFile}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs text-white bg-creed-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                New File
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="backdrop-blur-sm rounded-lg border shadow-card" style={{
        backgroundColor: '#1a2129',
        borderColor: '#2d3748',
        borderWidth: '1px'
      }}>
        <div className="p-4 sm:p-6">
          {/* Header with Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-creed-danger/10">
                <Trash2 className="w-4 h-4 text-creed-danger" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-creed-text-bright">Reset Data</h2>
                <p className="text-xs text-creed-muted mt-0.5">
                  Permanently delete selected data
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {hasSelection && (
                <span className="text-xs text-creed-muted">
                  {Object.values(selectedData).filter(v => v).length} selected
                </span>
              )}
              <button
                onClick={toggleAll}
                className="text-xs font-medium text-creed-accent hover:text-creed-accent/80 transition-colors px-2 py-1"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!hasSelection || saveStatus === 'saving' || isDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs text-white bg-creed-danger hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isDeleting ? (
                  <>
                    <Spinner size="sm" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Reset Selected
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="flex items-start gap-2 p-3 rounded-lg border mb-4" style={{
            backgroundColor: '#1f1206',
            borderColor: '#d97706',
            borderWidth: '1px'
          }}>
            <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-yellow-300/90">
                <strong>Warning:</strong> This action is irreversible. Selected data will be permanently deleted.
              </p>
            </div>
          </div>

          {/* Data Type Selection - Multi-column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-4">
            {dataTypes.map((dataType) => {
              const Icon = dataType.icon;
              const isSelected = selectedData[dataType.id];

              return (
                <button
                  key={dataType.id}
                  onClick={() => toggleDataType(dataType.id)}
                  disabled={saveStatus === 'saving' || isDeleting}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-creed-danger/10 border-creed-danger'
                      : 'hover:bg-creed-primary/5 border-transparent'
                  }`}
                  style={{
                    borderWidth: '1px'
                  }}
                  title={dataType.description}
                >
                  {/* Checkbox */}
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected
                      ? 'bg-creed-danger border-creed-danger'
                      : 'border-creed-muted'
                  }`}>
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Icon */}
                  <div className={`p-1.5 rounded ${
                    isSelected ? 'bg-creed-danger/20' : 'bg-creed-primary/10'
                  }`}>
                    <Icon className={`w-3.5 h-3.5 ${
                      isSelected ? 'text-creed-danger' : 'text-creed-primary'
                    }`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="text-xs font-semibold text-creed-text truncate">{dataType.name}</h3>
                    <span className="text-[10px] text-creed-muted">
                      {dataType.count} {dataType.count === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Data Reset Confirmation Modal */}
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
        loadingText="Deleting..."
      />

      {/* Switch Data File Confirmation Modal */}
      <ConfirmModal
        isOpen={showSwitchFileModal}
        onClose={() => !isSwitchingFile && setShowSwitchFileModal(false)}
        onConfirm={handleSwitchDataFile}
        title="Switch Data File"
        message={
          <>
            Switch to <strong className="text-creed-primary">{dataFileManager.getDisplayName(fileToSwitchTo)}</strong>?
            <br />
            <span className="text-creed-muted text-xs mt-2 block">
              The application will reload with the selected data file. Make sure all changes are saved before switching.
            </span>
          </>
        }
        confirmText="Switch Data File"
        cancelText="Cancel"
        isLoading={isSwitchingFile}
        loadingText="Switching..."
      />

      {/* Create New Data File Modal */}
      <Modal
        isOpen={showCreateFileModal}
        onClose={() => !isCreatingFile && setShowCreateFileModal(false)}
        title="Create New Data File"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-creed-text mb-2">
              File Name
            </label>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFileName.trim()) handleCreateNewFile();
              }}
              placeholder="Enter a name for the data file"
              className="w-full px-3 py-2 rounded-lg border text-sm bg-creed-base text-creed-text focus:outline-none focus:border-creed-primary"
              style={{
                backgroundColor: '#0f1419',
                borderColor: '#2d3748',
              }}
              disabled={isCreatingFile}
              autoFocus
            />
            <p className="text-xs text-creed-muted mt-1">
              Technical file: {dataFileManager.getNextDataFileName(availableDataFiles.map(f => f.name))}
            </p>
          </div>

          <p className="text-xs text-creed-muted">
            A new empty data file will be created in your GitHub repository and set as the active file.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowCreateFileModal(false);
                setNewFileName('');
              }}
              disabled={isCreatingFile}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-creed-text hover:bg-creed-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateNewFile}
              disabled={isCreatingFile || !newFileName.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-creed-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingFile ? (
                <>
                  <Spinner size="sm" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create File
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Users, Plus, Edit2, Trash2, TrendingUp, TrendingDown, Calendar, DollarSign, FileText, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { usePartners } from '../hooks/usePartners';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import PageLoader from './PageLoader';
import Spinner from './Spinner';
import { formatDate } from '../utils/dateFormatter';

const ITEMS_PER_PAGE = 15;

export default function Partners() {
  const {
    partners,
    loading,
    error,
    createPartner,
    updatePartner,
    deletePartner,
    createPartnerTransaction,
    updatePartnerTransaction,
    deletePartnerTransaction,
    getPartnerTransactions,
    getPartnerById,
    isActionLoading,
  } = usePartners();

  // Partner management state
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [partnerError, setPartnerError] = useState<string | null>(null);

  // Transaction management state
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<'injection' | 'withdrawal'>('injection');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [transactionError, setTransactionError] = useState<string | null>(null);

  // Confirmation modals
  const [showDeletePartnerConfirm, setShowDeletePartnerConfirm] = useState(false);
  const [deletingPartnerId, setDeletingPartnerId] = useState<string | null>(null);
  const [showDeleteTransactionConfirm, setShowDeleteTransactionConfirm] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Get transactions for selected partner with pagination
  const selectedPartnerTransactions = useMemo(() => {
    if (!selectedPartnerId) return [];
    return getPartnerTransactions(selectedPartnerId);
  }, [selectedPartnerId, getPartnerTransactions]);

  const { paginatedTransactions, totalPages } = useMemo(() => {
    const total = Math.ceil(selectedPartnerTransactions.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginated = selectedPartnerTransactions.slice(startIndex, endIndex);

    return {
      paginatedTransactions: paginated,
      totalPages: total,
    };
  }, [selectedPartnerTransactions, currentPage]);

  // Reset to page 1 when transactions change
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const selectedPartner = selectedPartnerId ? getPartnerById(selectedPartnerId) : null;

  // Partner Modal Handlers
  const handleOpenPartnerModal = (partnerId?: string) => {
    if (partnerId) {
      const partner = getPartnerById(partnerId);
      if (partner) {
        setEditingPartnerId(partnerId);
        setPartnerName(partner.name);
      }
    } else {
      setEditingPartnerId(null);
      setPartnerName('');
    }
    setPartnerError(null);
    setShowPartnerModal(true);
  };

  const handleClosePartnerModal = () => {
    setShowPartnerModal(false);
    setEditingPartnerId(null);
    setPartnerName('');
    setPartnerError(null);
  };

  const handleSavePartner = async () => {
    if (!partnerName.trim()) {
      setPartnerError('Partner name is required');
      return;
    }

    const result = editingPartnerId
      ? await updatePartner(editingPartnerId, partnerName.trim())
      : await createPartner(partnerName.trim());

    if (result.success) {
      handleClosePartnerModal();
      if (!editingPartnerId && result.data) {
        setSelectedPartnerId(result.data.id);
      }
    } else {
      setPartnerError(result.error || 'Failed to save partner');
    }
  };

  const handleDeletePartner = (partnerId: string) => {
    setDeletingPartnerId(partnerId);
    setShowDeletePartnerConfirm(true);
  };

  const confirmDeletePartner = async () => {
    if (!deletingPartnerId) return;

    const result = await deletePartner(deletingPartnerId);
    setShowDeletePartnerConfirm(false);

    if (result.success) {
      if (selectedPartnerId === deletingPartnerId) {
        setSelectedPartnerId(null);
      }
      setDeletingPartnerId(null);
    } else {
      setPartnerError(result.error || 'Failed to delete partner');
    }
  };

  // Transaction Modal Handlers
  const handleOpenTransactionModal = (transactionId?: string) => {
    if (!selectedPartnerId) return;

    if (transactionId) {
      const transaction = selectedPartnerTransactions.find(t => t.id === transactionId);
      if (transaction) {
        setEditingTransactionId(transactionId);
        setTransactionType(transaction.type);
        setTransactionAmount(transaction.amountUSD.toString());
        setTransactionDate(transaction.date);
        setTransactionDescription(transaction.description);
      }
    } else {
      setEditingTransactionId(null);
      setTransactionType('injection');
      setTransactionAmount('');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setTransactionDescription('');
    }
    setTransactionError(null);
    setShowTransactionModal(true);
  };

  const handleCloseTransactionModal = () => {
    setShowTransactionModal(false);
    setEditingTransactionId(null);
    setTransactionType('injection');
    setTransactionAmount('');
    setTransactionDate('');
    setTransactionDescription('');
    setTransactionError(null);
  };

  const handleSaveTransaction = async () => {
    if (!selectedPartnerId) return;

    if (!transactionDate) {
      setTransactionError('Date is required');
      return;
    }

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      setTransactionError('Amount must be a positive number');
      return;
    }

    if (!transactionDescription.trim()) {
      setTransactionError('Description is required');
      return;
    }

    const result = editingTransactionId
      ? await updatePartnerTransaction(
          editingTransactionId,
          transactionType,
          amount,
          transactionDate,
          transactionDescription.trim()
        )
      : await createPartnerTransaction(
          selectedPartnerId,
          transactionType,
          amount,
          transactionDate,
          transactionDescription.trim()
        );

    if (result.success) {
      handleCloseTransactionModal();
    } else {
      setTransactionError(result.error || 'Failed to save transaction');
    }
  };

  const handleDeleteTransaction = (transactionId: string) => {
    setDeletingTransactionId(transactionId);
    setShowDeleteTransactionConfirm(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!deletingTransactionId) return;

    const result = await deletePartnerTransaction(deletingTransactionId);
    setShowDeleteTransactionConfirm(false);

    if (result.success) {
      setDeletingTransactionId(null);
    } else {
      setTransactionError(result.error || 'Failed to delete transaction');
    }
  };

  // Pagination helpers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

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

  if (loading) {
    return (
      <PageLoader
        title="Loading Partners"
        message="Fetching partners data"
        icon={
          <div className="p-4 rounded-xl border-2 border-creed-primary/20" style={{
            backgroundColor: '#151a21'
          }}>
            <Users className="w-12 h-12 text-creed-primary" />
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
          <h1 className="text-2xl font-bold text-creed-text-bright mb-1">Partners</h1>
          <p className="text-creed-muted">Manage partners and their capital transactions</p>
        </div>
        <button
          onClick={() => handleOpenPartnerModal()}
          disabled={isActionLoading('create')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
          style={{
            backgroundColor: '#0c4a6e',
            borderColor: '#0284c7',
            color: '#fff'
          }}
        >
          {isActionLoading('create') ? (
            <>
              <Spinner size="sm" />
              <span>Adding...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Add Partner</span>
            </>
          )}
        </button>
      </div>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.length === 0 ? (
          <div className="col-span-full backdrop-blur-sm rounded-lg border shadow-card p-12 text-center" style={{
            backgroundColor: '#1a2129',
            borderColor: '#2d3748',
            borderWidth: '1px'
          }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
              backgroundColor: '#151a21',
              borderColor: '#2d3748',
              borderWidth: '1px'
            }}>
              <Users className="w-8 h-8 text-creed-muted" />
            </div>
            <h3 className="text-lg font-semibold text-creed-text mb-2">No partners yet</h3>
            <p className="text-creed-muted mb-4">
              Start by adding your first partner to track investments
            </p>
            <button
              onClick={() => handleOpenPartnerModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border hover:shadow-md"
              style={{
                backgroundColor: '#0c4a6e',
                borderColor: '#0284c7',
                color: '#fff'
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Add First Partner</span>
            </button>
          </div>
        ) : (
          partners.map((partner) => {
            const isSelected = selectedPartnerId === partner.id;
            const transactionCount = getPartnerTransactions(partner.id).length;

            return (
              <div
                key={partner.id}
                onClick={() => setSelectedPartnerId(partner.id)}
                className="backdrop-blur-sm rounded-lg border shadow-card p-4 cursor-pointer transition-all hover:shadow-lg"
                style={{
                  backgroundColor: isSelected ? '#0c1115' : '#1a2129',
                  borderColor: isSelected ? '#0284c7' : '#2d3748',
                  borderWidth: isSelected ? '2px' : '1px'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-creed-text-bright mb-1">
                      {partner.name}
                    </h3>
                    <p className="text-xs text-creed-muted">
                      {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPartnerModal(partner.id);
                      }}
                      disabled={isActionLoading('update', partner.id)}
                      className="p-1.5 rounded-lg transition-all hover:bg-creed-primary/10 disabled:opacity-50"
                      title="Edit partner"
                    >
                      <Edit2 className="w-4 h-4 text-creed-muted hover:text-creed-text" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePartner(partner.id);
                      }}
                      disabled={isActionLoading('delete', partner.id)}
                      className="p-1.5 rounded-lg transition-all hover:bg-creed-danger/10 disabled:opacity-50"
                      title="Delete partner"
                    >
                      <Trash2 className="w-4 h-4 text-creed-danger" />
                    </button>
                  </div>
                </div>

                <div className={`text-2xl font-bold ${
                  partner.balance < 0 ? 'text-creed-danger' : partner.balance > 0 ? 'text-creed-success' : 'text-creed-muted'
                }`}>
                  ${Math.abs(partner.balance).toFixed(2)}
                </div>
                <div className="text-xs text-creed-muted mt-1">
                  {partner.balance < 0 ? 'Withdrawn more' : partner.balance > 0 ? 'Net invested' : 'No balance'}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Transactions Section */}
      {selectedPartner && (
        <div className="backdrop-blur-sm rounded-lg border shadow-card" style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px'
        }}>
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#2d3748' }}>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-creed-primary" />
              <h3 className="text-lg font-semibold text-creed-text-bright">
                {selectedPartner.name} - Transactions
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setTransactionType('injection');
                  handleOpenTransactionModal();
                }}
                disabled={isActionLoading('transaction')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all border disabled:opacity-50 hover:shadow-md"
                style={{
                  backgroundColor: '#1e2d27',
                  borderColor: '#4ade80',
                  color: '#4ade80'
                }}
              >
                {isActionLoading('transaction') ? (
                  <>
                    <Spinner size="sm" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="w-4 h-4" />
                    <span>Injection</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setTransactionType('withdrawal');
                  handleOpenTransactionModal();
                }}
                disabled={isActionLoading('transaction')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all border disabled:opacity-50 hover:shadow-md"
                style={{
                  backgroundColor: '#2d1e1e',
                  borderColor: '#ef4444',
                  color: '#ef4444'
                }}
              >
                {isActionLoading('transaction') ? (
                  <>
                    <Spinner size="sm" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownCircle className="w-4 h-4" />
                    <span>Withdrawal</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {selectedPartnerTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
                borderWidth: '1px'
              }}>
                <FileText className="w-8 h-8 text-creed-muted" />
              </div>
              <h3 className="text-lg font-semibold text-creed-text mb-2">No transactions yet</h3>
              <p className="text-creed-muted">
                Record capital injections or withdrawals for this partner
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: '#2d3748' }}>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-creed-muted uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-creed-muted uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-creed-muted uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-creed-muted uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-creed-muted uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b transition-colors hover:bg-creed-primary/5"
                        style={{ borderColor: '#2d3748' }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-creed-muted" />
                            <span className="text-xs text-creed-text">
                              {formatDate(transaction.date)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              transaction.type === 'injection'
                                ? 'bg-creed-success/20 text-creed-success border border-creed-success/30'
                                : 'bg-creed-danger/20 text-creed-danger border border-creed-danger/30'
                            }`}
                          >
                            {transaction.type === 'injection' ? (
                              <>
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Injection
                              </>
                            ) : (
                              <>
                                <TrendingDown className="w-3 h-3 mr-1" />
                                Withdrawal
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-creed-muted mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-creed-text">
                              {transaction.description}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <DollarSign className={`w-3.5 h-3.5 ${
                              transaction.type === 'injection' ? 'text-creed-success' : 'text-creed-danger'
                            }`} />
                            <span className={`text-xs font-bold ${
                              transaction.type === 'injection' ? 'text-creed-success' : 'text-creed-danger'
                            }`}>
                              ${transaction.amountUSD.toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenTransactionModal(transaction.id)}
                              disabled={isActionLoading('transaction', transaction.id)}
                              className="p-1.5 rounded-lg transition-all hover:bg-creed-primary/10 disabled:opacity-50"
                              title="Edit transaction"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-creed-muted hover:text-creed-text" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              disabled={isActionLoading('transaction', transaction.id)}
                              className="p-1.5 rounded-lg transition-all hover:bg-creed-danger/10 disabled:opacity-50"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-creed-danger" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-4 md:px-6 py-4 border-t" style={{ borderColor: '#2d3748' }}>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-creed-muted">
                      Showing <span className="font-semibold text-creed-text">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                      <span className="font-semibold text-creed-text">
                        {Math.min(currentPage * ITEMS_PER_PAGE, selectedPartnerTransactions.length)}
                      </span>{' '}
                      of <span className="font-semibold text-creed-text">{selectedPartnerTransactions.length}</span> transactions
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-creed-primary/10"
                        style={{
                          backgroundColor: currentPage === 1 ? 'transparent' : '#1a2129',
                          borderColor: '#2d3748',
                          borderWidth: '1px',
                        }}
                      >
                        <ChevronLeft className="w-4 h-4 text-creed-text" />
                      </button>

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

                      <div className="sm:hidden px-3 py-1.5 rounded-md text-xs font-medium text-creed-text" style={{
                        backgroundColor: '#1a2129',
                        borderColor: '#2d3748',
                        borderWidth: '1px',
                      }}>
                        {currentPage} / {totalPages}
                      </div>

                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-creed-primary/10"
                        style={{
                          backgroundColor: currentPage === totalPages ? 'transparent' : '#1a2129',
                          borderColor: '#2d3748',
                          borderWidth: '1px',
                        }}
                      >
                        <ChevronRight className="w-4 h-4 text-creed-text" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Partner Modal */}
      <Modal
        isOpen={showPartnerModal}
        onClose={handleClosePartnerModal}
        title={editingPartnerId ? 'Edit Partner' : 'Add New Partner'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-creed-text mb-2">
              Partner Name
            </label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => {
                setPartnerName(e.target.value);
                setPartnerError(null);
              }}
              className="w-full px-3 py-2 rounded-lg border text-creed-text placeholder-creed-muted focus:outline-none focus:ring-2 focus:ring-creed-primary"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
              }}
              placeholder="Enter partner name"
              autoFocus
            />
          </div>

          {partnerError && (
            <div className="p-3 rounded-lg border" style={{
              backgroundColor: '#2d1e1e',
              borderColor: '#ef4444',
              color: '#ef4444'
            }}>
              <p className="text-sm">{partnerError}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={handleClosePartnerModal}
              className="px-4 py-2 rounded-lg font-medium transition-all border"
              style={{
                backgroundColor: '#1a2129',
                borderColor: '#2d3748',
                color: '#94a3b8'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSavePartner}
              disabled={isActionLoading(editingPartnerId ? 'update' : 'create')}
              className="px-4 py-2 rounded-lg font-medium transition-all border disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#0c4a6e',
                borderColor: '#0284c7',
                color: '#fff'
              }}
            >
              {isActionLoading(editingPartnerId ? 'update' : 'create') ? (
                <>
                  <Spinner size="sm" />
                  <span className="ml-2">{editingPartnerId ? 'Updating...' : 'Adding...'}</span>
                </>
              ) : (
                editingPartnerId ? 'Update Partner' : 'Add Partner'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Transaction Modal */}
      <Modal
        isOpen={showTransactionModal}
        onClose={handleCloseTransactionModal}
        title={editingTransactionId ? 'Edit Transaction' : 'New Transaction'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-creed-text mb-2">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTransactionType('injection')}
                className={`px-4 py-2 rounded-lg font-medium transition-all border ${
                  transactionType === 'injection'
                    ? 'border-creed-success text-creed-success'
                    : 'border-creed-lighter text-creed-muted hover:border-creed-success/50'
                }`}
                style={{
                  backgroundColor: transactionType === 'injection' ? '#1e2d27' : '#1a2129',
                }}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Injection
              </button>
              <button
                onClick={() => setTransactionType('withdrawal')}
                className={`px-4 py-2 rounded-lg font-medium transition-all border ${
                  transactionType === 'withdrawal'
                    ? 'border-creed-danger text-creed-danger'
                    : 'border-creed-lighter text-creed-muted hover:border-creed-danger/50'
                }`}
                style={{
                  backgroundColor: transactionType === 'withdrawal' ? '#2d1e1e' : '#1a2129',
                }}
              >
                <TrendingDown className="w-4 h-4 inline mr-2" />
                Withdrawal
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-creed-text mb-2">
              Date
            </label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => {
                setTransactionDate(e.target.value);
                setTransactionError(null);
              }}
              className="w-full px-3 py-2 rounded-lg border text-creed-text focus:outline-none focus:ring-2 focus:ring-creed-primary"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-creed-text mb-2">
              Amount (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={transactionAmount}
              onChange={(e) => {
                setTransactionAmount(e.target.value);
                setTransactionError(null);
              }}
              className="w-full px-3 py-2 rounded-lg border text-creed-text placeholder-creed-muted focus:outline-none focus:ring-2 focus:ring-creed-primary"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
              }}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-creed-text mb-2">
              Description
            </label>
            <textarea
              value={transactionDescription}
              onChange={(e) => {
                setTransactionDescription(e.target.value);
                setTransactionError(null);
              }}
              className="w-full px-3 py-2 rounded-lg border text-creed-text placeholder-creed-muted focus:outline-none focus:ring-2 focus:ring-creed-primary resize-none"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
              }}
              placeholder="Enter transaction description"
              rows={3}
            />
          </div>

          {transactionError && (
            <div className="p-3 rounded-lg border" style={{
              backgroundColor: '#2d1e1e',
              borderColor: '#ef4444',
              color: '#ef4444'
            }}>
              <p className="text-sm">{transactionError}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={handleCloseTransactionModal}
              className="px-4 py-2 rounded-lg font-medium transition-all border"
              style={{
                backgroundColor: '#1a2129',
                borderColor: '#2d3748',
                color: '#94a3b8'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTransaction}
              disabled={isActionLoading('transaction')}
              className="px-4 py-2 rounded-lg font-medium transition-all border disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#0c4a6e',
                borderColor: '#0284c7',
                color: '#fff'
              }}
            >
              {isActionLoading('transaction') ? (
                <>
                  <Spinner size="sm" />
                  <span className="ml-2">{editingTransactionId ? 'Updating...' : 'Adding...'}</span>
                </>
              ) : (
                editingTransactionId ? 'Update Transaction' : 'Add Transaction'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Partner Confirmation */}
      <ConfirmModal
        isOpen={showDeletePartnerConfirm}
        onClose={() => setShowDeletePartnerConfirm(false)}
        onConfirm={confirmDeletePartner}
        title="Delete Partner"
        message="Are you sure you want to delete this partner? This action cannot be undone. You must delete all their transactions first."
        confirmText="Delete"
        confirmStyle="danger"
      />

      {/* Delete Transaction Confirmation */}
      <ConfirmModal
        isOpen={showDeleteTransactionConfirm}
        onClose={() => setShowDeleteTransactionConfirm(false)}
        onConfirm={confirmDeleteTransaction}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This will update the partner's balance and cash situation."
        confirmText="Delete"
        confirmStyle="danger"
      />
    </div>
  );
}

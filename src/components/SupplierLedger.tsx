import { useState, useMemo, useEffect } from 'react';
import { BookOpen, TrendingUp, TrendingDown, FileText, Calendar, User } from 'lucide-react';
import { useSuppliers } from '../hooks/useSuppliers';
import { useSupplierLedger } from '../hooks/useSupplierLedger';
import PageLoader from './PageLoader';
import { formatDate } from '../utils/dateFormatter';

interface SupplierLedgerProps {
  preselectedSupplierId?: string | null;
}

export default function SupplierLedger({ preselectedSupplierId }: SupplierLedgerProps) {
  const { suppliers } = useSuppliers();
  const {
    ledgerEntries,
    loading,
    error,
    getLedgerEntriesBySupplierId,
    calculateRunningBalance,
  } = useSupplierLedger();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

  // Apply preselected supplier when provided
  useEffect(() => {
    if (preselectedSupplierId) {
      setSelectedSupplierId(preselectedSupplierId);
    }
  }, [preselectedSupplierId]);

  // Get selected supplier
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  // Get supplier ledger entries with recalculated running balances
  const supplierLedgerEntries = useMemo(() => {
    if (!selectedSupplierId) return [];

    const entries = getLedgerEntriesBySupplierId(selectedSupplierId);

    // First, sort chronologically (oldest first) by date for balance calculation
    const chronologicalEntries = [...entries].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      // If dates are equal, use createdAt as tiebreaker
      if (dateA === dateB) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return dateA - dateB;
    });

    // Recalculate running balances chronologically
    let runningBalance = 0;
    const entriesWithCorrectBalance = chronologicalEntries.map(entry => {
      runningBalance += entry.amount;
      return {
        ...entry,
        balance: runningBalance
      };
    });

    // Now sort by date descending for display (newest first), using createdAt as tiebreaker
    return entriesWithCorrectBalance.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA === dateB) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return dateB - dateA;
    });
  }, [selectedSupplierId, ledgerEntries, getLedgerEntriesBySupplierId]);

  // Calculate current balance from the chronologically LAST entry (not most recently created)
  const currentBalance = useMemo(() => {
    if (!selectedSupplierId || supplierLedgerEntries.length === 0) return 0;

    // Find the chronologically LAST entry (latest date + createdAt)
    const chronologicallyLast = [...supplierLedgerEntries].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA === dateB) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return dateA - dateB;
    }).pop(); // Get the last entry chronologically

    return chronologicallyLast?.balance || 0;
  }, [selectedSupplierId, supplierLedgerEntries]);

  // Pre-calculate all supplier balances
  const supplierBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    suppliers.forEach(supplier => {
      const entries = getLedgerEntriesBySupplierId(supplier.id);
      if (entries.length === 0) {
        balances[supplier.id] = 0;
      } else {
        // Sort chronologically and calculate running balance
        const chronological = [...entries].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA === dateB) {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }
          return dateA - dateB;
        });

        let runningBalance = 0;
        chronological.forEach(entry => {
          runningBalance += entry.amount;
        });

        balances[supplier.id] = runningBalance;
      }
    });
    return balances;
  }, [suppliers, getLedgerEntriesBySupplierId, ledgerEntries]);

  // Calculate statistics - dynamically calculated
  const { totalDebit, totalCredit, transactionCount } = useMemo(() => {
    const debit = supplierLedgerEntries
      .filter(e => e.type === 'container')
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    const credit = supplierLedgerEntries
      .filter(e => e.type === 'payment')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalDebit: debit,
      totalCredit: credit,
      transactionCount: supplierLedgerEntries.length
    };
  }, [supplierLedgerEntries]);

  if (loading) {
    return (
      <PageLoader
        title="Loading Supplier Ledger"
        message="Fetching ledger data"
        icon={
          <div className="p-4 rounded-xl border-2 border-creed-primary/20" style={{
            backgroundColor: '#151a21'
          }}>
            <BookOpen className="w-12 h-12 text-creed-primary" />
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
          <h1 className="text-2xl font-bold text-creed-text-bright mb-1">Supplier Ledger</h1>
          <p className="text-creed-muted">Track supplier balances, purchases, and payments</p>
        </div>
      </div>

      {/* Supplier Cards Selector */}
      <div className="backdrop-blur-sm rounded-lg border shadow-card p-4" style={{
        backgroundColor: '#1a2129',
        borderColor: '#2d3748',
        borderWidth: '1px'
      }}>
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-creed-primary" />
          <label className="text-xs font-semibold text-creed-muted uppercase tracking-wide">
            Select Supplier
          </label>
        </div>

        {suppliers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-creed-muted">No suppliers found. Create a supplier first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {suppliers.map((supplier) => {
              const balance = supplierBalances[supplier.id] || 0;
              const isSelected = selectedSupplierId === supplier.id;

              return (
                <button
                  key={supplier.id}
                  onClick={() => setSelectedSupplierId(supplier.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-creed-primary bg-creed-primary/10 shadow-lg'
                      : 'border-transparent bg-creed-bg-dark/50 hover:border-creed-accent/30 hover:bg-creed-bg-dark/70'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className={`text-sm font-semibold ${
                        isSelected ? 'text-creed-text-bright' : 'text-creed-text'
                      }`}>
                        {supplier.name}
                      </h3>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-creed-primary" />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {balance < 0 ? (
                      <>
                        <TrendingDown className="w-3.5 h-3.5 text-creed-danger" />
                        <span className="text-xs font-bold text-creed-danger">
                          €{Math.abs(balance).toFixed(2)}
                        </span>
                      </>
                    ) : balance > 0 ? (
                      <>
                        <TrendingUp className="w-3.5 h-3.5 text-creed-success" />
                        <span className="text-xs font-bold text-creed-success">
                          €{balance.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-medium text-creed-muted">€0.00</span>
                    )}
                  </div>

                  <p className="text-[10px] text-creed-muted mt-1">
                    {balance < 0 ? 'Owed to supplier' : balance > 0 ? 'Credit balance' : 'No balance'}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedSupplierId ? (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Current Balance */}
            <div className="backdrop-blur-sm rounded-lg border shadow-card p-3" style={{
              backgroundColor: currentBalance < 0 ? '#2d1e1e' : '#1e2d27',
              borderColor: currentBalance < 0 ? '#ef4444' : '#4ade80',
              borderWidth: '2px'
            }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-creed-muted uppercase tracking-wide">Current Balance</span>
                {currentBalance < 0 ? (
                  <div className="p-1 rounded bg-creed-danger/20">
                    <TrendingDown className="w-3 h-3 text-creed-danger" />
                  </div>
                ) : (
                  <div className="p-1 rounded bg-creed-success/20">
                    <TrendingUp className="w-3 h-3 text-creed-success" />
                  </div>
                )}
              </div>
              <div className={`text-xl font-bold ${currentBalance < 0 ? 'text-creed-danger' : 'text-creed-success'}`}>
                €{Math.abs(currentBalance).toFixed(2)}
              </div>
              <div className="text-[10px] text-creed-muted mt-1">
                {currentBalance < 0 ? 'Owed to supplier' : currentBalance > 0 ? 'Credit balance' : 'No balance'}
              </div>
            </div>

            {/* Total Purchases */}
            <div className="backdrop-blur-sm rounded-lg border shadow-card p-3" style={{
              backgroundColor: '#1a2129',
              borderColor: '#2d3748',
              borderWidth: '1px'
            }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-creed-muted uppercase tracking-wide">Total Purchases</span>
                <div className="p-1 rounded bg-creed-danger/10">
                  <TrendingDown className="w-3 h-3 text-creed-danger" />
                </div>
              </div>
              <div className="text-xl font-bold text-creed-text-bright">
                €{totalDebit.toFixed(2)}
              </div>
              <div className="text-[10px] text-creed-muted mt-1">
                From containers
              </div>
            </div>

            {/* Total Payments */}
            <div className="backdrop-blur-sm rounded-lg border shadow-card p-3" style={{
              backgroundColor: '#1a2129',
              borderColor: '#2d3748',
              borderWidth: '1px'
            }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-creed-muted uppercase tracking-wide">Total Payments</span>
                <div className="p-1 rounded bg-creed-success/10">
                  <TrendingUp className="w-3 h-3 text-creed-success" />
                </div>
              </div>
              <div className="text-xl font-bold text-creed-text-bright">
                €{totalCredit.toFixed(2)}
              </div>
              <div className="text-[10px] text-creed-muted mt-1">
                Payments made
              </div>
            </div>

            {/* Transaction Count */}
            <div className="backdrop-blur-sm rounded-lg border shadow-card p-3" style={{
              backgroundColor: '#1a2129',
              borderColor: '#2d3748',
              borderWidth: '1px'
            }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-creed-muted uppercase tracking-wide">Transactions</span>
                <div className="p-1 rounded bg-creed-accent/10">
                  <FileText className="w-3 h-3 text-creed-accent" />
                </div>
              </div>
              <div className="text-xl font-bold text-creed-text-bright">
                {transactionCount}
              </div>
              <div className="text-[10px] text-creed-muted mt-1">
                Total entries
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="backdrop-blur-sm rounded-lg border shadow-card" style={{
            backgroundColor: '#1a2129',
            borderColor: '#2d3748',
            borderWidth: '1px'
          }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: '#2d3748' }}>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-creed-primary" />
                <h3 className="text-lg font-semibold text-creed-text-bright">
                  Transaction History - {selectedSupplier?.name}
                </h3>
              </div>
            </div>

            {supplierLedgerEntries.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                  backgroundColor: '#151a21',
                  borderColor: '#2d3748',
                  borderWidth: '1px'
                }}>
                  <BookOpen className="w-8 h-8 text-creed-muted" />
                </div>
                <h3 className="text-lg font-semibold text-creed-text mb-2">No transactions yet</h3>
                <p className="text-creed-muted">
                  This supplier has no recorded transactions
                </p>
              </div>
            ) : (
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
                        Running Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierLedgerEntries.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className="border-b transition-colors hover:bg-creed-primary/5"
                        style={{ borderColor: '#2d3748' }}
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-creed-muted" />
                            <span className="text-xs text-creed-text">
                              {formatDate(entry.date)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              entry.type === 'payment'
                                ? 'bg-creed-success/20 text-creed-success border border-creed-success/30'
                                : 'bg-creed-danger/20 text-creed-danger border border-creed-danger/30'
                            }`}
                          >
                            {entry.type === 'payment' ? (
                              <>
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Payment
                              </>
                            ) : (
                              <>
                                <TrendingDown className="w-3 h-3 mr-1" />
                                Purchase
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-start gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-creed-muted mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-creed-text">
                              {entry.description}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className={`text-xs font-bold ${
                            entry.amount < 0 ? 'text-creed-danger' : 'text-creed-success'
                          }`}>
                            {entry.amount < 0 ? '-' : '+'}€{Math.abs(entry.amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {entry.balance < 0 ? (
                              <div className="p-1 rounded-full bg-creed-danger/20">
                                <TrendingDown className="w-3 h-3 text-creed-danger" />
                              </div>
                            ) : (
                              <div className="p-1 rounded-full bg-creed-success/20">
                                <TrendingUp className="w-3 h-3 text-creed-success" />
                              </div>
                            )}
                            <span className={`text-xs font-bold ${
                              entry.balance < 0 ? 'text-creed-danger' : 'text-creed-success'
                            }`}>
                              €{Math.abs(entry.balance).toFixed(2)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="backdrop-blur-sm rounded-lg border shadow-card" style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px'
        }}>
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{
              backgroundColor: '#151a21',
              borderColor: '#2d3748',
              borderWidth: '2px'
            }}>
              <BookOpen className="w-10 h-10 text-creed-accent" />
            </div>
            <h3 className="text-xl font-semibold text-creed-text mb-2">Select a Supplier</h3>
            <p className="text-creed-muted max-w-md mx-auto">
              Choose a supplier from the dropdown above to view their transaction history, balance, and payment records
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

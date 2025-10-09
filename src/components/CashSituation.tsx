import { Wallet, TrendingUp, TrendingDown, ShoppingCart, Receipt, FileText, Calendar, DollarSign } from 'lucide-react';
import { useCashSituation } from '../hooks/useCashSituation';
import PageLoader from './PageLoader';
import { formatDate } from '../utils/dateFormatter';

export default function CashSituation() {
  const {
    cashTransactions,
    loading,
    error,
    currentBalance,
    totalIncome,
    totalExpenses,
    transactionCount,
  } = useCashSituation();

  if (loading) {
    return (
      <PageLoader
        title="Loading Cash Situation"
        message="Fetching cash transactions"
        icon={
          <div className="p-4 rounded-xl border-2 border-creed-primary/20" style={{
            backgroundColor: '#151a21'
          }}>
            <Wallet className="w-12 h-12 text-creed-primary" />
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
          <h1 className="text-2xl font-bold text-creed-text-bright mb-1">Cash Situation</h1>
          <p className="text-creed-muted">Track your cash flow, income, and expenses</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Balance */}
        <div className="backdrop-blur-sm rounded-lg border shadow-card p-4" style={{
          backgroundColor: currentBalance < 0 ? '#2d1e1e' : currentBalance > 0 ? '#1e2d27' : '#1a2129',
          borderColor: currentBalance < 0 ? '#ef4444' : currentBalance > 0 ? '#4ade80' : '#2d3748',
          borderWidth: '2px'
        }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium text-creed-muted uppercase tracking-wide">Current Balance</span>
            <div className="p-1.5 rounded-lg" style={{
              backgroundColor: currentBalance < 0 ? '#2d1e1e' : currentBalance > 0 ? '#1e2d27' : '#151a21'
            }}>
              <Wallet className={`w-4 h-4 ${
                currentBalance < 0 ? 'text-creed-danger' : currentBalance > 0 ? 'text-creed-success' : 'text-creed-muted'
              }`} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${
            currentBalance < 0 ? 'text-creed-danger' : currentBalance > 0 ? 'text-creed-success' : 'text-creed-text-bright'
          }`}>
            ${Math.abs(currentBalance).toFixed(2)}
          </div>
          <div className="text-[10px] text-creed-muted mt-1">
            {currentBalance < 0 ? 'Deficit' : currentBalance > 0 ? 'Surplus' : 'Neutral'}
          </div>
        </div>

        {/* Total Income */}
        <div className="backdrop-blur-sm rounded-lg border shadow-card p-4" style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px'
        }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium text-creed-muted uppercase tracking-wide">Total Income</span>
            <div className="p-1.5 rounded-lg bg-creed-success/10">
              <TrendingUp className="w-4 h-4 text-creed-success" />
            </div>
          </div>
          <div className="text-2xl font-bold text-creed-text-bright">
            ${totalIncome.toFixed(2)}
          </div>
          <div className="text-[10px] text-creed-muted mt-1">
            From sales
          </div>
        </div>

        {/* Total Expenses */}
        <div className="backdrop-blur-sm rounded-lg border shadow-card p-4" style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px'
        }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium text-creed-muted uppercase tracking-wide">Total Expenses</span>
            <div className="p-1.5 rounded-lg bg-creed-danger/10">
              <TrendingDown className="w-4 h-4 text-creed-danger" />
            </div>
          </div>
          <div className="text-2xl font-bold text-creed-text-bright">
            ${totalExpenses.toFixed(2)}
          </div>
          <div className="text-[10px] text-creed-muted mt-1">
            All expenses
          </div>
        </div>

        {/* Transaction Count */}
        <div className="backdrop-blur-sm rounded-lg border shadow-card p-4" style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px'
        }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium text-creed-muted uppercase tracking-wide">Transactions</span>
            <div className="p-1.5 rounded-lg bg-creed-accent/10">
              <FileText className="w-4 h-4 text-creed-accent" />
            </div>
          </div>
          <div className="text-2xl font-bold text-creed-text-bright">
            {transactionCount}
          </div>
          <div className="text-[10px] text-creed-muted mt-1">
            Total entries
          </div>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="backdrop-blur-sm rounded-lg border shadow-card" style={{
        backgroundColor: '#1a2129',
        borderColor: '#2d3748',
        borderWidth: '1px'
      }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: '#2d3748' }}>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-creed-primary" />
            <h3 className="text-lg font-semibold text-creed-text-bright">
              Transaction History
            </h3>
          </div>
        </div>

        {cashTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
              backgroundColor: '#151a21',
              borderColor: '#2d3748',
              borderWidth: '1px'
            }}>
              <Wallet className="w-8 h-8 text-creed-muted" />
            </div>
            <h3 className="text-lg font-semibold text-creed-text mb-2">No transactions yet</h3>
            <p className="text-creed-muted">
              Cash transactions will appear here when you create sales or expenses
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
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {cashTransactions.map((transaction) => (
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
                          transaction.type === 'sale'
                            ? 'bg-creed-success/20 text-creed-success border border-creed-success/30'
                            : 'bg-creed-danger/20 text-creed-danger border border-creed-danger/30'
                        }`}
                      >
                        {transaction.type === 'sale' ? (
                          <>
                            <ShoppingCart className="w-3 h-3 mr-1" />
                            Sale
                          </>
                        ) : (
                          <>
                            <Receipt className="w-3 h-3 mr-1" />
                            Expense
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
                      <span className={`text-xs font-bold ${
                        transaction.amount < 0 ? 'text-creed-danger' : 'text-creed-success'
                      }`}>
                        {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className={`p-1 rounded-full ${
                          transaction.balance < 0 ? 'bg-creed-danger/20' : 'bg-creed-success/20'
                        }`}>
                          <DollarSign className={`w-3 h-3 ${
                            transaction.balance < 0 ? 'text-creed-danger' : 'text-creed-success'
                          }`} />
                        </div>
                        <span className={`text-xs font-bold ${
                          transaction.balance < 0 ? 'text-creed-danger' : 'text-creed-success'
                        }`}>
                          ${Math.abs(transaction.balance).toFixed(2)}
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
    </div>
  );
}

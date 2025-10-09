import { useState } from 'react';
import { FileText, ShoppingCart, Receipt } from 'lucide-react';
import ProfitLossReport from './reports/ProfitLossReport';
import SalesReport from './reports/SalesReport';
import ExpensesReport from './reports/ExpensesReport';
import DateRangeSelector from './reports/DateRangeSelector';
import { DateRange } from '../hooks/useReports';

type ReportType = 'sales' | 'expenses' | 'profitLoss';

interface TabConfig {
  id: ReportType;
  label: string;
  icon: React.ElementType;
}

const tabs: TabConfig[] = [
  { id: 'sales', label: 'Sales', icon: ShoppingCart },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'profitLoss', label: 'P&L', icon: FileText },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportType>('sales');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const renderReport = () => {
    switch (activeTab) {
      case 'profitLoss':
        return <ProfitLossReport dateRange={dateRange} />;
      case 'sales':
        return <SalesReport dateRange={dateRange} />;
      case 'expenses':
        return <ExpensesReport dateRange={dateRange} />;
      default:
        return <SalesReport dateRange={dateRange} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-creed-text-bright mb-1">Business Reports</h1>
        <p className="text-creed-muted">Comprehensive business analytics and insights</p>
      </div>

      {/* Date Range Selector */}
      <div
        className="backdrop-blur-sm rounded-lg border shadow-card p-4"
        style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px',
        }}
      >
        <DateRangeSelector
          selectedRange={dateRange}
          onRangeChange={setDateRange}
        />
      </div>

      {/* Tab Navigation */}
      <div
        className="backdrop-blur-sm rounded-lg border shadow-card overflow-x-auto"
        style={{
          backgroundColor: '#1a2129',
          borderColor: '#2d3748',
          borderWidth: '1px',
        }}
      >
        <div className="flex min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200
                  border-b-2 relative
                  ${isActive
                    ? 'text-creed-primary border-creed-primary'
                    : 'text-creed-muted border-transparent hover:text-creed-text hover:bg-creed-primary/5'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>

                {/* Active indicator background */}
                {isActive && (
                  <div
                    className="absolute inset-0 bg-creed-primary/5 -z-10"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Content */}
      <div className="animate-fadeIn">
        {renderReport()}
      </div>
    </div>
  );
}

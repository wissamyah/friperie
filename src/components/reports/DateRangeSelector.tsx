import { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { DateRange } from '../../hooks/useReports';

interface DateRangeSelectorProps {
  selectedRange: DateRange | null;
  onRangeChange: (range: DateRange | null) => void;
}

type QuickRange = 'today' | 'week' | 'month' | 'year' | 'custom';

export default function DateRangeSelector({
  selectedRange,
  onRangeChange,
}: DateRangeSelectorProps) {
  const [activeQuick, setActiveQuick] = useState<QuickRange>('month');
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const getQuickRange = (type: QuickRange): DateRange | null => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    switch (type) {
      case 'today':
        return { start: today, end: today };

      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return {
          start: weekStart.toISOString().split('T')[0],
          end: today,
        };
      }

      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          start: monthStart.toISOString().split('T')[0],
          end: today,
        };
      }

      case 'year': {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return {
          start: yearStart.toISOString().split('T')[0],
          end: today,
        };
      }

      default:
        return null;
    }
  };

  const handleQuickSelect = (type: QuickRange) => {
    if (type === 'custom') {
      setShowCustom(true);
      setActiveQuick(type);
    } else {
      const range = getQuickRange(type);
      setActiveQuick(type);
      setShowCustom(false);
      onRangeChange(range);
    }
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onRangeChange({ start: customStart, end: customEnd });
      setShowCustom(false);
    }
  };

  const handleClear = () => {
    onRangeChange(null);
    setActiveQuick('month');
    setCustomStart('');
    setCustomEnd('');
    setShowCustom(false);
  };

  const quickRanges: { id: QuickRange; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-4">
      {/* Quick Range Buttons */}
      <div className="flex flex-wrap gap-2">
        {quickRanges.map((range) => (
          <button
            key={range.id}
            onClick={() => handleQuickSelect(range.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              activeQuick === range.id
                ? 'bg-creed-primary text-white border-creed-primary'
                : 'text-creed-text border-creed-lighter hover:border-creed-primary hover:bg-creed-primary/10'
            }`}
          >
            {range.label}
          </button>
        ))}
        {selectedRange && (
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all border border-creed-lighter text-creed-danger hover:border-creed-danger hover:bg-creed-danger/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Custom Date Range */}
      {showCustom && (
        <div
          className="p-4 rounded-lg border space-y-4"
          style={{
            backgroundColor: '#151a21',
            borderColor: '#2d3748',
            borderWidth: '1px',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-creed-primary" />
            <h4 className="text-sm font-semibold text-creed-text">Custom Date Range</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-creed-muted mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border transition-all focus:ring-1 focus:ring-creed-primary focus:border-creed-primary outline-none text-creed-text"
                style={{
                  backgroundColor: '#0d1117',
                  borderColor: '#2d3748',
                  borderWidth: '1px',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-creed-muted mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                min={customStart}
                className="w-full px-3 py-2 text-sm rounded-md border transition-all focus:ring-1 focus:ring-creed-primary focus:border-creed-primary outline-none text-creed-text"
                style={{
                  backgroundColor: '#0d1117',
                  borderColor: '#2d3748',
                  borderWidth: '1px',
                }}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowCustom(false)}
              className="px-4 py-2 rounded-md text-sm font-medium text-creed-muted hover:text-creed-text hover:bg-creed-primary/5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCustomApply}
              disabled={!customStart || !customEnd}
              className="px-4 py-2 rounded-md text-sm font-medium text-white bg-creed-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-button-3d"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Selected Range Display */}
      {selectedRange && !showCustom && (
        <div className="text-xs text-creed-muted">
          Showing data from <span className="text-creed-text font-medium">{selectedRange.start}</span> to{' '}
          <span className="text-creed-text font-medium">{selectedRange.end}</span>
        </div>
      )}
    </div>
  );
}

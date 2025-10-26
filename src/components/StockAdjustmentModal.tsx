import { useState, useEffect } from 'react';
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import Modal from './Modal';
import Spinner from './Spinner';
import { StockAdjustmentType } from '../services/github/types';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    adjustmentType: StockAdjustmentType;
    quantityChange: number;
    reason: string;
    newStockCost?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  product: {
    id: string;
    name: string;
    currentQuantity: number;
    currentCost: number;
  };
  isLoading: boolean;
}

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  onSubmit,
  product,
  isLoading,
}: StockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentType>('correction');
  const [quantityInput, setQuantityInput] = useState('');
  const [reason, setReason] = useState('');
  const [newStockCost, setNewStockCost] = useState('');
  const [showCostInput, setShowCostInput] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAdjustmentType('correction');
      setQuantityInput('');
      setReason('');
      setNewStockCost('');
      setShowCostInput(false);
    }
  }, [isOpen]);

  // Update cost input visibility based on adjustment type
  useEffect(() => {
    const isIncrease = adjustmentType === 'increase' || adjustmentType === 'found';
    setShowCostInput(isIncrease);
    if (!isIncrease) {
      setNewStockCost('');
    }
  }, [adjustmentType]);

  const quantityChange = parseFloat(quantityInput) || 0;
  const isDecrease = adjustmentType === 'decrease' || adjustmentType === 'damage' || adjustmentType === 'loss';
  const finalQuantityChange = isDecrease ? -Math.abs(quantityChange) : Math.abs(quantityChange);
  const newQuantity = product.currentQuantity + finalQuantityChange;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (quantityChange === 0) {
      alert('Please enter a quantity');
      return;
    }

    if (!reason.trim()) {
      alert('Please provide a reason for this adjustment');
      return;
    }

    if (newQuantity < 0) {
      alert(`Adjustment would result in negative stock (${newQuantity} bags)`);
      return;
    }

    const result = await onSubmit({
      adjustmentType,
      quantityChange: finalQuantityChange,
      reason: reason.trim(),
      newStockCost: newStockCost ? parseFloat(newStockCost) : undefined,
    });

    if (result.success) {
      onClose();
    } else {
      alert(`Failed to create adjustment: ${result.error}`);
    }
  };

  const adjustmentTypeOptions: { value: StockAdjustmentType; label: string; description: string; isDecrease: boolean }[] = [
    { value: 'increase', label: 'General Increase', description: 'Add stock (general)', isDecrease: false },
    { value: 'decrease', label: 'General Decrease', description: 'Remove stock (general)', isDecrease: true },
    { value: 'physical-count', label: 'Physical Count', description: 'Inventory reconciliation', isDecrease: false },
    { value: 'damage', label: 'Damaged Goods', description: 'Damaged/unsellable items', isDecrease: true },
    { value: 'loss', label: 'Lost/Stolen', description: 'Missing inventory', isDecrease: true },
    { value: 'found', label: 'Found Stock', description: 'Discovered inventory', isDecrease: false },
    { value: 'correction', label: 'System Correction', description: 'Fix data entry errors', isDecrease: false },
  ];

  return (
    <Modal isOpen={isOpen} onClose={() => !isLoading && onClose()} title="Adjust Stock">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Info */}
        <div className="backdrop-blur-sm rounded-lg border p-4" style={{
          backgroundColor: '#151a21',
          borderColor: '#2d3748',
          borderWidth: '1px'
        }}>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-creed-muted">Product:</span>
              <span className="text-sm font-semibold text-creed-text-bright">{product.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-creed-muted">Current Stock:</span>
              <span className="text-sm font-semibold text-creed-text">{product.currentQuantity} bags</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-creed-muted">Current Avg Cost:</span>
              <span className="text-sm font-semibold text-creed-accent">${product.currentCost.toFixed(2)}/bag</span>
            </div>
          </div>
        </div>

        {/* Adjustment Type */}
        <div>
          <label className="block text-sm font-semibold text-creed-text mb-2">
            Adjustment Type
          </label>
          <select
            value={adjustmentType}
            onChange={(e) => setAdjustmentType(e.target.value as StockAdjustmentType)}
            disabled={isLoading}
            className="w-full px-4 py-2 rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text"
            style={{
              backgroundColor: '#151a21',
              borderColor: '#2d3748',
              borderWidth: '1px'
            }}
          >
            {adjustmentTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity Input */}
        <div>
          <label className="block text-sm font-semibold text-creed-text mb-2">
            Quantity (bags)
          </label>
          <div className="relative">
            <input
              type="number"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              placeholder="Enter quantity"
              min="0"
              step="1"
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text placeholder-creed-muted"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
                borderWidth: '1px'
              }}
              autoFocus
            />
            {quantityChange > 0 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isDecrease ? (
                  <TrendingDown className="w-5 h-5 text-creed-danger" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-creed-accent" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Optional Cost Input (for increases) */}
        {showCostInput && (
          <div>
            <label className="block text-sm font-semibold text-creed-text mb-2">
              Cost Per Bag (USD) - Optional
            </label>
            <input
              type="number"
              value={newStockCost}
              onChange={(e) => setNewStockCost(e.target.value)}
              placeholder="Leave empty to use current cost"
              min="0"
              step="0.01"
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text placeholder-creed-muted"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
                borderWidth: '1px'
              }}
            />
            <p className="text-xs text-creed-muted mt-1">
              If provided, weighted average cost will be recalculated
            </p>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-sm font-semibold text-creed-text mb-2">
            Reason <span className="text-creed-danger">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this adjustment is needed"
            rows={3}
            disabled={isLoading}
            className="w-full px-4 py-2 rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text placeholder-creed-muted resize-none"
            style={{
              backgroundColor: '#151a21',
              borderColor: '#2d3748',
              borderWidth: '1px'
            }}
          />
        </div>

        {/* Preview */}
        {quantityChange > 0 && (
          <div className="backdrop-blur-sm rounded-lg border p-4" style={{
            backgroundColor: '#151a21',
            borderColor: newQuantity < 0 ? '#ef4444' : '#2d3748',
            borderWidth: '1px'
          }}>
            <div className="flex items-start gap-2">
              <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${newQuantity < 0 ? 'text-creed-danger' : 'text-creed-primary'}`} />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-creed-text">Preview:</p>
                <p className="text-sm text-creed-muted">
                  Change: <span className={isDecrease ? 'text-creed-danger' : 'text-creed-accent'}>
                    {finalQuantityChange > 0 ? '+' : ''}{finalQuantityChange} bags
                  </span>
                </p>
                <p className="text-sm text-creed-muted">
                  New Stock: <span className={`font-semibold ${newQuantity < 0 ? 'text-creed-danger' : 'text-creed-text-bright'}`}>
                    {newQuantity} bags
                  </span>
                </p>
                {newQuantity < 0 && (
                  <p className="text-xs text-creed-danger mt-1">
                    Warning: This adjustment would result in negative stock
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!quantityInput || !reason.trim() || isLoading || newQuantity < 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all border disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
            style={{
              backgroundColor: '#0c4a6e',
              borderColor: '#0284c7',
              color: '#fff'
            }}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" />
                Adjusting...
              </>
            ) : (
              'Confirm Adjustment'
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg font-semibold text-creed-text hover:bg-creed-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

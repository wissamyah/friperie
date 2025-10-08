import { useState, useMemo } from 'react';
import { Plus, Trash2, Container as ContainerIcon, X, Package, TrendingUp, DollarSign, Edit2 } from 'lucide-react';
import { useContainers } from '../hooks/useContainers';
import { useSuppliers } from '../hooks/useSuppliers';
import { useProducts } from '../hooks/useProducts';
import { usePayments } from '../hooks/usePayments';
import { useSupplierLedger } from '../hooks/useSupplierLedger';
import { useSaveStatusContext } from '../contexts/SaveStatusContext';
import { ContainerProductLine, PaymentAllocation } from '../services/github/types';
import { githubDataManager } from '../services/githubDataManager';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import Spinner from './Spinner';
import PageLoader from './PageLoader';
import Tooltip from './Tooltip';

interface ProductRow {
  id: string;
  productId: string;
  quantityBags: number;
  priceEUR: number;
}

interface QuickPaymentData {
  date: string;
  amountEUR: number;
  exchangeRate: number;
  commissionPercent: number;
  notes: string;
}

export default function Containers() {
  const {
    containers,
    loading,
    error,
    createContainer,
    updateContainer,
    deleteContainer,
    isActionLoading,
    calculateGrandTotalEUR,
    calculateTotalBags,
    calculateFinalCosts,
  } = useContainers();

  const { suppliers } = useSuppliers();
  const { products, updateProduct } = useProducts();
  const {
    payments,
    createPayment,
    getUnallocatedPayments,
    calculateAmountUSD,
    allocateToContainer,
    removeAllocation,
  } = usePayments();
  const { createContainerEntry, createPaymentEntry, deleteLedgerEntry, ledgerEntries } = useSupplierLedger();
  const { status: saveStatus } = useSaveStatusContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingContainerId, setEditingContainerId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; containerNumber: string } | null>(null);

  // Form state
  const [date, setDate] = useState('');
  const [containerNumber, setContainerNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [productRows, setProductRows] = useState<ProductRow[]>([
    { id: `row-${Date.now()}`, productId: '', quantityBags: 0, priceEUR: 0 },
  ]);
  const [freightCostEUR, setFreightCostEUR] = useState(0);
  const [customsDutiesUSD, setCustomsDutiesUSD] = useState(0);
  // Map of paymentId -> allocated amount in EUR
  const [paymentAllocations, setPaymentAllocations] = useState<Map<string, number>>(new Map());

  // Quick payment modal state
  const [showQuickPayment, setShowQuickPayment] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [quickPaymentData, setQuickPaymentData] = useState<QuickPaymentData>({
    date: '',
    amountEUR: 0,
    exchangeRate: 0,
    commissionPercent: 0,
    notes: '',
  });

  // Calculate line total for a row
  const calculateLineTotal = (quantityBags: number, priceEUR: number) => {
    return quantityBags * priceEUR;
  };

  // Calculate products total
  const calculateProductsTotal = () => {
    return productRows.reduce((sum, row) => {
      return sum + calculateLineTotal(row.quantityBags, row.priceEUR);
    }, 0);
  };

  // Calculate final grand total EUR
  const calculateFinalGrandTotalEUR = () => {
    return calculateProductsTotal() + freightCostEUR;
  };

  // Get available payments for selected supplier
  // In edit mode, include payments already allocated to this container
  const availablePayments = useMemo(() => {
    if (!supplierId) return [];

    // Get unallocated payments directly from payments array
    const unallocated = payments.filter(
      (p) => p.supplierId === supplierId && p.unallocatedEUR > 0
    );

    // In edit mode, also include payments allocated to this container
    if (isEditMode && editingContainerId) {
      const allocatedToThisContainer = payments.filter(p =>
        p.supplierId === supplierId &&
        p.allocations.some(alloc => alloc.containerId === editingContainerId)
      );

      // Merge and deduplicate by payment ID
      const paymentMap = new Map();
      [...unallocated, ...allocatedToThisContainer].forEach(p => {
        if (!paymentMap.has(p.id)) {
          paymentMap.set(p.id, p);
        }
      });

      return Array.from(paymentMap.values());
    }

    return unallocated;
  }, [supplierId, isEditMode, editingContainerId, payments]);

  // Helper: Set payment allocation amount
  const setPaymentAllocationAmount = (paymentId: string, amount: number) => {
    setPaymentAllocations(prev => {
      const newMap = new Map(prev);
      if (amount > 0) {
        newMap.set(paymentId, amount);
      } else {
        newMap.delete(paymentId);
      }
      return newMap;
    });
  };

  // Helper: Remove payment allocation
  const removePaymentAllocation = (paymentId: string) => {
    setPaymentAllocations(prev => {
      const newMap = new Map(prev);
      newMap.delete(paymentId);
      return newMap;
    });
  };

  // Helper: Get payment allocation amount
  const getPaymentAllocationAmount = (paymentId: string): number => {
    return paymentAllocations.get(paymentId) || 0;
  };

  // Helper: Get remaining container balance
  const getRemainingContainerBalance = (): number => {
    const totalNeeded = calculateFinalGrandTotalEUR();
    const totalAllocated = calculateAllocatedEUR();
    return totalNeeded - totalAllocated;
  };

  // Helper: Get available amount for a payment (includes amount already allocated to this container in edit mode)
  const getPaymentAvailableAmount = (payment: typeof payments[0]): number => {
    let available = payment.unallocatedEUR;

    // In edit mode, add back the amount currently allocated to this container
    if (isEditMode && editingContainerId) {
      const currentAllocation = payment.allocations.find(
        alloc => alloc.containerId === editingContainerId
      );
      if (currentAllocation) {
        available += currentAllocation.amountEUR;
      }
    }

    return available;
  };

  // Calculate allocated EUR from payment allocations
  const calculateAllocatedEUR = () => {
    let total = 0;
    paymentAllocations.forEach((amount) => {
      total += amount;
    });
    return total;
  };

  // Calculate allocated USD from payment allocations
  const calculateAllocatedUSD = () => {
    let total = 0;
    paymentAllocations.forEach((amountEUR, paymentId) => {
      const payment = availablePayments.find(p => p.id === paymentId);
      if (payment) {
        // Calculate proportional USD based on allocated EUR
        const proportion = amountEUR / payment.amountEUR;
        total += payment.amountUSD * proportion;
      }
    });
    return total;
  };

  // Calculate weighted average cost
  const calculateWeightedAverageCost = (
    currentStock: number,
    currentCost: number,
    newStock: number,
    newCost: number
  ): number => {
    if (currentStock === 0) {
      return newCost;
    }

    const totalValue = (currentStock * currentCost) + (newStock * newCost);
    const totalQuantity = currentStock + newStock;

    return totalValue / totalQuantity;
  };

  // Calculate reverse weighted average cost (when removing stock)
  const calculateReverseWeightedAverageCost = (
    currentStock: number,
    currentCost: number,
    removedStock: number,
    removedCost: number
  ): number => {
    // If removing all stock, return 0
    if (currentStock <= removedStock) {
      return 0;
    }

    // Current total value
    const currentTotalValue = currentStock * currentCost;

    // Value being removed
    const removedValue = removedStock * removedCost;

    // Remaining value and stock
    const remainingValue = currentTotalValue - removedValue;
    const remainingStock = currentStock - removedStock;

    // Avoid division by zero
    if (remainingStock === 0) {
      return 0;
    }

    return remainingValue / remainingStock;
  };

  // Add new product row
  const addProductRow = () => {
    setProductRows([
      ...productRows,
      { id: `row-${Date.now()}`, productId: '', quantityBags: 0, priceEUR: 0 },
    ]);
  };

  // Remove product row
  const removeProductRow = (id: string) => {
    if (productRows.length > 1) {
      setProductRows(productRows.filter((row) => row.id !== id));
    }
  };

  // Update product row
  const updateProductRow = (id: string, field: keyof ProductRow, value: any) => {
    setProductRows(
      productRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  // Add payment with smart default amount
  const addPaymentAllocation = (paymentId: string) => {
    const payment = availablePayments.find(p => p.id === paymentId);
    if (!payment) return;

    // Smart default: min of available payment amount or remaining container balance
    const availableAmount = getPaymentAvailableAmount(payment);
    const defaultAmount = Math.min(availableAmount, getRemainingContainerBalance());
    setPaymentAllocationAmount(paymentId, Math.max(0, defaultAmount));
  };

  // Reset form
  const resetForm = () => {
    setDate('');
    setContainerNumber('');
    setSupplierId('');
    setProductRows([{ id: `row-${Date.now()}`, productId: '', quantityBags: 0, priceEUR: 0 }]);
    setFreightCostEUR(0);
    setCustomsDutiesUSD(0);
    setPaymentAllocations(new Map());
    setIsEditMode(false);
    setEditingContainerId(null);
    setShowQuickPayment(false);
    setQuickPaymentData({
      date: '',
      amountEUR: 0,
      exchangeRate: 0,
      commissionPercent: 0,
      notes: '',
    });
  };

  // Open edit modal with container data
  const handleEditContainer = (containerId: string) => {
    const container = containers.find(c => c.id === containerId);
    if (!container) return;

    setIsEditMode(true);
    setEditingContainerId(containerId);
    setDate(container.date);
    setContainerNumber(container.containerNumber);
    setSupplierId(container.supplierId);
    setProductRows(container.products.map(p => ({
      id: `row-${Date.now()}-${Math.random()}`,
      productId: p.productId,
      quantityBags: p.quantityBags,
      priceEUR: p.priceEUR,
    })));
    setFreightCostEUR(container.freightCostEUR);
    setCustomsDutiesUSD(container.customsDutiesUSD || 0);

    // Restore payment allocations with their amounts
    const allocationsMap = new Map<string, number>();
    payments.forEach(payment => {
      const allocation = payment.allocations.find(alloc => alloc.containerId === containerId);
      if (allocation) {
        allocationsMap.set(payment.id, allocation.amountEUR);
      }
    });

    setPaymentAllocations(allocationsMap);
    setIsModalOpen(true);
  };

  // Validate form
  const isFormValid = () => {
    if (!date || !containerNumber.trim() || !supplierId) return false;
    if (productRows.length === 0) return false;

    // Check if all product rows are valid
    for (const row of productRows) {
      if (!row.productId || row.quantityBags <= 0 || row.priceEUR <= 0) {
        return false;
      }
    }

    return true;
  };

  const handleQuickPayment = async () => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) {
      alert('Supplier not found');
      return;
    }

    setIsCreatingPayment(true);
    try {
      // Start batch update for payment + ledger entry
      githubDataManager.startBatchUpdate();

      // Create the payment
      const result = await createPayment(
        supplierId,
        supplier.name,
        quickPaymentData.date,
        quickPaymentData.amountEUR,
        quickPaymentData.exchangeRate,
        quickPaymentData.commissionPercent,
        quickPaymentData.notes
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create payment');
      }

      // Create ledger entry for the payment (credit)
      const ledgerResult = await createPaymentEntry(
        supplierId,
        supplier.name,
        quickPaymentData.amountEUR,
        `Payment received - ${quickPaymentData.notes || 'No notes'}`,
        quickPaymentData.date
      );

      if (!ledgerResult.success) {
        throw new Error(ledgerResult.error || 'Failed to create ledger entry');
      }

      await githubDataManager.endBatchUpdate();

      // Auto-add the new payment with smart default amount
      addPaymentAllocation(result.data.id);
      setShowQuickPayment(false);
      setQuickPaymentData({
        date: '',
        amountEUR: 0,
        exchangeRate: 0,
        commissionPercent: 0,
        notes: '',
      });
    } catch (error: any) {
      alert(`Failed to create payment: ${error.message}`);
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid()) return;

    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) {
      alert('Selected supplier not found');
      return;
    }

    // Build container product lines
    const containerProducts: ContainerProductLine[] = productRows.map((row) => {
      const product = products.find((p) => p.id === row.productId);
      return {
        productId: row.productId,
        productName: product?.name || '',
        quantityBags: row.quantityBags,
        priceEUR: row.priceEUR,
        lineTotal: calculateLineTotal(row.quantityBags, row.priceEUR),
      };
    });

    // Build payment allocations (for container's perspective) using manual amounts
    // Note: We'll sync these to payment records after container creation
    const containerPaymentAllocations: PaymentAllocation[] = [];
    const selectedPaymentsList: typeof availablePayments = [];

    paymentAllocations.forEach((amountEUR, paymentId) => {
      const payment = availablePayments.find(p => p.id === paymentId);
      if (payment && amountEUR > 0) {
        // Calculate proportional USD based on allocated EUR
        const proportion = amountEUR / payment.amountEUR;
        const amountUSD = payment.amountUSD * proportion;

        containerPaymentAllocations.push({
          containerId: '', // Will be filled after creation
          containerNumber: containerNumber.trim(),
          amountEUR,
          amountUSD,
        });

        selectedPaymentsList.push(payment);
      }
    });

    const totalBags = calculateTotalBags(containerProducts);
    const totalUSDPaid = calculateAllocatedUSD();
    const { totalCostUSD, costPerBagUSD } = calculateFinalCosts(
      totalUSDPaid,
      customsDutiesUSD,
      totalBags
    );

    // Calculate status fields
    const grandTotalEUR = calculateFinalGrandTotalEUR();
    const totalEURPaid = calculateAllocatedEUR();

    // Payment status: unpaid (0), partial (< total), paid (>= total)
    let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (totalEURPaid === 0) {
      paymentStatus = 'unpaid';
    } else if (totalEURPaid >= grandTotalEUR) {
      paymentStatus = 'paid';
    } else {
      paymentStatus = 'partial';
    }

    // Customs status: paid if customs entered, pending otherwise
    const customsStatus: 'pending' | 'paid' = customsDutiesUSD > 0 ? 'paid' : 'pending';

    // Container status: closed if payment paid AND customs paid, open otherwise
    const containerStatus: 'open' | 'closed' = paymentStatus === 'paid' && customsStatus === 'paid' ? 'closed' : 'open';

    try {
      // Start batch update
      githubDataManager.startBatchUpdate();

      if (isEditMode && editingContainerId) {
        // UPDATE MODE
        // Get the original container before update
        const originalContainer = containers.find(c => c.id === editingContainerId);
        const wasOpen = originalContainer?.containerStatus === 'open';

        const result = await updateContainer(editingContainerId, {
          containerNumber: containerNumber.trim(),
          date,
          supplierId,
          supplierName: supplier.name,
          products: containerProducts,
          freightCostEUR,
          paymentAllocations: containerPaymentAllocations,
          customsDutiesUSD,
          productsTotalEUR: calculateProductsTotal(),
          grandTotalEUR,
          totalEURPaid,
          totalUSDPaid,
          totalCostUSD,
          costPerBagUSD,
          paymentStatus,
          customsStatus,
          containerStatus,
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to update container');
        }

        // Sync payment allocations to payment records
        // Process all allocations sequentially to ensure proper state accumulation
        // Get fresh payment data from githubDataManager to ensure we have latest state
        const currentPayments = githubDataManager.getData('payments');

        // Get original payment IDs from the payment records (not from container)
        const originalPaymentIds = currentPayments
          .filter(p => p.allocations.some(alloc => alloc.containerId === editingContainerId))
          .map(p => p.id);

        const newPaymentIds = selectedPaymentsList.map(p => p.id);

        // Build updated payments array sequentially to preserve all allocations
        // Use reduce to accumulate state properly
        const updatedPayments = currentPayments.reduce((accumulator, payment) => {
          const wasAllocated = originalPaymentIds.includes(payment.id);
          const shouldBeAllocated = newPaymentIds.includes(payment.id);

          if (!wasAllocated && !shouldBeAllocated) {
            // No change to this payment - add as-is
            accumulator.push(payment);
            return accumulator;
          }

          // Start with current allocations, remove the old allocation for this container
          let updatedAllocations = payment.allocations.filter(
            alloc => alloc.containerId !== editingContainerId
          );

          // If should be allocated, add the new allocation with manual amount
          if (shouldBeAllocated) {
            const allocatedAmount = paymentAllocations.get(payment.id);
            if (allocatedAmount && allocatedAmount > 0) {
              const proportion = allocatedAmount / payment.amountEUR;
              const amountUSD = payment.amountUSD * proportion;

              const newAllocation: PaymentAllocation = {
                containerId: editingContainerId,
                containerNumber: containerNumber.trim(),
                amountEUR: allocatedAmount,
                amountUSD,
              };

              updatedAllocations = [...updatedAllocations, newAllocation];
            }
          }

          // Recalculate unallocated amount
          const totalAllocatedEUR = updatedAllocations.reduce(
            (sum, alloc) => sum + alloc.amountEUR,
            0
          );
          const unallocatedEUR = payment.amountEUR - totalAllocatedEUR;

          const updatedPayment = {
            ...payment,
            allocations: updatedAllocations,
            unallocatedEUR,
            updatedAt: new Date().toISOString(),
          };

          accumulator.push(updatedPayment);
          return accumulator;
        }, [] as typeof currentPayments);

        // Update all payments at once
        await githubDataManager.updateData('payments', updatedPayments, false);

        // Update product quantities and costs ONLY if container transitioned from open to closed
        if (result.data && wasOpen && result.data.containerStatus === 'closed') {
          const quantitiesAdded: {
            [productId: string]: {
              quantityAdded: number;
              stockBefore: number;
              costBefore: number;
            }
          } = {};

          for (const row of productRows) {
            const product = products.find((p) => p.id === row.productId);
            if (product) {
              const currentStock = product.quantity || 0;
              const currentCost = product.costPerBagUSD || 0;
              const newStock = row.quantityBags;

              // Calculate this product's proportional cost
              // Product's EUR percentage of total
              const productLineTotal = row.quantityBags * row.priceEUR;
              const productPercentage = grandTotalEUR > 0 ? productLineTotal / grandTotalEUR : 0;

              // Apply percentage to total USD cost (payments + customs)
              const productUSDCost = productPercentage * (totalUSDPaid + customsDutiesUSD);

              // Calculate cost per bag for this specific product
              const newCost = newStock > 0 ? productUSDCost / newStock : 0;

              const newWeightedAvgCost = calculateWeightedAverageCost(
                currentStock,
                currentCost,
                newStock,
                newCost
              );

              const productResult = await updateProduct(row.productId, {
                quantity: currentStock + newStock,
                costPerBagUSD: newWeightedAvgCost
              });

              if (!productResult.success) {
                throw new Error(productResult.error || `Failed to update quantity for ${product.name}`);
              }

              // Track details for this product for future cost recalculation
              quantitiesAdded[row.productId] = {
                quantityAdded: newStock,
                stockBefore: currentStock,
                costBefore: currentCost,
              };
            }
          }

          // Update container to record quantities added to stock
          await updateContainer(editingContainerId, {
            quantityAddedToStock: quantitiesAdded,
          });
        } else if (!wasOpen && result.data?.containerStatus === 'closed' && originalContainer?.quantityAddedToStock) {
          // If container was already closed and is being edited, recalculate costs based on new prices
          // without changing stock quantities
          const storedQuantities = originalContainer.quantityAddedToStock;

          for (const row of productRows) {
            const product = products.find((p) => p.id === row.productId);
            const storedData = storedQuantities[row.productId];

            if (product && storedData) {
              const { quantityAdded, stockBefore, costBefore } = storedData;

              // Calculate this product's proportional cost
              // Product's EUR percentage of total
              const productLineTotal = row.quantityBags * row.priceEUR;
              const productPercentage = grandTotalEUR > 0 ? productLineTotal / grandTotalEUR : 0;

              // Apply percentage to total USD cost (payments + customs)
              const productUSDCost = productPercentage * (totalUSDPaid + customsDutiesUSD);

              // Calculate cost per bag for this specific product
              const newContainerCost = quantityAdded > 0 ? productUSDCost / quantityAdded : 0;

              const recalculatedCost = calculateWeightedAverageCost(
                stockBefore,
                costBefore,
                quantityAdded,
                newContainerCost
              );

              // Update only the cost, not the quantity
              const productResult = await updateProduct(row.productId, {
                costPerBagUSD: recalculatedCost
              });

              if (!productResult.success) {
                throw new Error(productResult.error || `Failed to update cost for ${product.name}`);
              }
            }
          }
        }
      } else {
        // CREATE MODE
        const containerResult = await createContainer({
          containerNumber: containerNumber.trim(),
          date,
          supplierId,
          supplierName: supplier.name,
          products: containerProducts,
          freightCostEUR,
          paymentAllocations: containerPaymentAllocations,
          customsDutiesUSD,
          productsTotalEUR: calculateProductsTotal(),
          grandTotalEUR,
          totalEURPaid,
          totalUSDPaid,
          totalCostUSD,
          costPerBagUSD,
          paymentStatus,
          customsStatus,
          containerStatus,
        });

        if (!containerResult.success) {
          throw new Error(containerResult.error || 'Failed to create container');
        }

        // Create ledger entry (only for new containers)
        const ledgerResult = await createContainerEntry(
          supplierId,
          supplier.name,
          containerNumber.trim(),
          calculateFinalGrandTotalEUR(),
          date,
          containerResult.data!.id
        );

        if (!ledgerResult.success) {
          throw new Error(ledgerResult.error || 'Failed to create ledger entry');
        }

        // Sync payment allocations to payment records
        // Process all allocations sequentially to ensure proper state accumulation
        if (selectedPaymentsList.length > 0) {
          // Get fresh payment data from githubDataManager to ensure we have latest state
          const currentPayments = githubDataManager.getData('payments');

          // Build all allocations sequentially to preserve all allocations
          // Use reduce to accumulate state properly
          const updatedPayments = currentPayments.reduce((accumulator, payment) => {
            // Check if this payment should be allocated to the container
            const allocatedAmount = paymentAllocations.get(payment.id);
            if (!allocatedAmount || allocatedAmount <= 0) {
              // No change to this payment - add as-is
              accumulator.push(payment);
              return accumulator;
            }

            // Add the allocation with manual amount
            const proportion = allocatedAmount / payment.amountEUR;
            const amountUSD = payment.amountUSD * proportion;

            const newAllocation: PaymentAllocation = {
              containerId: containerResult.data!.id,
              containerNumber: containerNumber.trim(),
              amountEUR: allocatedAmount,
              amountUSD,
            };

            const updatedAllocations = [...payment.allocations, newAllocation];
            const totalAllocatedEUR = updatedAllocations.reduce(
              (sum, alloc) => sum + alloc.amountEUR,
              0
            );
            const unallocatedEUR = payment.amountEUR - totalAllocatedEUR;

            const updatedPayment = {
              ...payment,
              allocations: updatedAllocations,
              unallocatedEUR,
              updatedAt: new Date().toISOString(),
            };

            accumulator.push(updatedPayment);
            return accumulator;
          }, [] as typeof currentPayments);

          // Update all payments at once
          await githubDataManager.updateData('payments', updatedPayments, false);
        }

        // Note: We don't create ledger entries here because the payment ledger entry
        // was already created when the payment was originally recorded

        // Update product quantities and costs (only if container is created as closed)
        if (containerResult.data && containerResult.data.containerStatus === 'closed') {
          const quantitiesAdded: {
            [productId: string]: {
              quantityAdded: number;
              stockBefore: number;
              costBefore: number;
            }
          } = {};

          for (const row of productRows) {
            const product = products.find((p) => p.id === row.productId);
            if (product) {
              const currentStock = product.quantity || 0;
              const currentCost = product.costPerBagUSD || 0;
              const newStock = row.quantityBags;

              // Calculate this product's proportional cost
              // Product's EUR percentage of total
              const productLineTotal = row.quantityBags * row.priceEUR;
              const productPercentage = grandTotalEUR > 0 ? productLineTotal / grandTotalEUR : 0;

              // Apply percentage to total USD cost (payments + customs)
              const productUSDCost = productPercentage * (totalUSDPaid + customsDutiesUSD);

              // Calculate cost per bag for this specific product
              const newCost = newStock > 0 ? productUSDCost / newStock : 0;

              const newWeightedAvgCost = calculateWeightedAverageCost(
                currentStock,
                currentCost,
                newStock,
                newCost
              );

              const productResult = await updateProduct(row.productId, {
                quantity: currentStock + newStock,
                costPerBagUSD: newWeightedAvgCost
              });

              if (!productResult.success) {
                throw new Error(productResult.error || `Failed to update quantity for ${product.name}`);
              }

              // Track details for this product for future cost recalculation
              quantitiesAdded[row.productId] = {
                quantityAdded: newStock,
                stockBefore: currentStock,
                costBefore: currentCost,
              };
            }
          }

          // Update container to record quantities added to stock
          const updatedContainer = {
            ...containerResult.data,
            quantityAddedToStock: quantitiesAdded,
            updatedAt: new Date().toISOString(),
          };
          await updateContainer(containerResult.data.id, updatedContainer);
        }
      }

      // End batch update
      await githubDataManager.endBatchUpdate();

      // Success - close modal and reset form
      resetForm();
      setIsModalOpen(false);
    } catch (error: any) {
      alert(`Failed to ${isEditMode ? 'update' : 'create'} container: ${error.message}`);
    }
  };

  const handleDeleteContainer = async () => {
    if (!deleteConfirm) return;

    const containerId = deleteConfirm.id;
    const container = containers.find(c => c.id === containerId);

    if (!container) {
      alert('Container not found');
      return;
    }

    try {
      // Start batch update for atomic operation
      githubDataManager.startBatchUpdate();

      // STEP 1: Revert product stock and costs (if container was closed)
      if (container.containerStatus === 'closed' && container.quantityAddedToStock) {
        for (const [productId, stockData] of Object.entries(container.quantityAddedToStock)) {
          const product = products.find(p => p.id === productId);
          if (product) {
            const { quantityAdded, stockBefore, costBefore } = stockData;

            // Calculate the cost that was added by this container
            const productRow = container.products.find(p => p.productId === productId);
            if (!productRow) continue;

            // Calculate this product's proportional cost from the container
            const productLineTotal = productRow.quantityBags * productRow.priceEUR;
            const productPercentage = container.grandTotalEUR > 0
              ? productLineTotal / container.grandTotalEUR
              : 0;
            const productUSDCost = productPercentage * (container.totalUSDPaid + container.customsDutiesUSD);
            const containerCostPerBag = quantityAdded > 0 ? productUSDCost / quantityAdded : 0;

            // Calculate new cost by reversing the weighted average
            const newCost = calculateReverseWeightedAverageCost(
              product.quantity,
              product.costPerBagUSD,
              quantityAdded,
              containerCostPerBag
            );

            // Calculate new quantity
            const newQuantity = product.quantity - quantityAdded;

            // Update product
            const productResult = await updateProduct(productId, {
              quantity: Math.max(0, newQuantity),
              costPerBagUSD: newCost
            });

            if (!productResult.success) {
              throw new Error(productResult.error || `Failed to revert stock for ${product.name}`);
            }
          }
        }
      }

      // STEP 2: Deallocate payments
      if (container.paymentAllocations && container.paymentAllocations.length > 0) {
        const currentPayments = githubDataManager.getData('payments');

        const updatedPayments = currentPayments.map(payment => {
          // Check if this payment has an allocation to this container
          const hasAllocation = payment.allocations.some(
            alloc => alloc.containerId === containerId
          );

          if (!hasAllocation) {
            return payment;
          }

          // Remove the allocation for this container
          const updatedAllocations = payment.allocations.filter(
            alloc => alloc.containerId !== containerId
          );

          // Recalculate unallocated amount
          const totalAllocatedEUR = updatedAllocations.reduce(
            (sum, alloc) => sum + alloc.amountEUR,
            0
          );
          const unallocatedEUR = payment.amountEUR - totalAllocatedEUR;

          return {
            ...payment,
            allocations: updatedAllocations,
            unallocatedEUR,
            updatedAt: new Date().toISOString(),
          };
        });

        await githubDataManager.updateData('payments', updatedPayments, false);
      }

      // STEP 3: Remove supplier ledger entry
      const ledgerEntry = ledgerEntries.find(
        entry => entry.relatedContainerId === containerId
      );
      if (ledgerEntry) {
        const deleteResult = await deleteLedgerEntry(ledgerEntry.id);
        if (!deleteResult.success) {
          throw new Error(deleteResult.error || 'Failed to delete ledger entry');
        }
      }

      // STEP 4: Delete the container
      const result = await deleteContainer(containerId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete container');
      }

      // End batch update
      await githubDataManager.endBatchUpdate();

      // Success
      setDeleteConfirm(null);
    } catch (error: any) {
      alert(`Failed to delete container: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <PageLoader
        title="Loading Containers"
        message="Fetching your container data"
        icon={
          <div className="p-4 rounded-xl border-2 border-creed-primary/20" style={{
            backgroundColor: '#151a21'
          }}>
            <ContainerIcon className="w-12 h-12 text-creed-primary" />
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

  const quickPaymentCalculatedUSD = quickPaymentData.amountEUR && quickPaymentData.exchangeRate
    ? calculateAmountUSD(quickPaymentData.amountEUR, quickPaymentData.exchangeRate, quickPaymentData.commissionPercent)
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-creed-text-bright mb-1">Containers</h1>
          <p className="text-creed-muted">Manage your container shipments</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={saveStatus === 'saving'}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-creed-primary hover:opacity-90 transition-all shadow-button-3d disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Add Container
        </button>
      </div>

      {/* Containers Table */}
      <div className="backdrop-blur-sm rounded-lg border shadow-card" style={{
        backgroundColor: '#1a2129',
        borderColor: '#2d3748',
        borderWidth: '1px'
      }}>
        {containers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
              backgroundColor: '#151a21',
              borderColor: '#2d3748',
              borderWidth: '1px'
            }}>
              <ContainerIcon className="w-8 h-8 text-creed-muted" />
            </div>
            <h3 className="text-lg font-semibold text-creed-text mb-2">No containers yet</h3>
            <p className="text-creed-muted">Get started by creating your first container</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#2d3748' }}>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-creed-text">Container #</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-creed-text">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-creed-text">Supplier</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-creed-text">Products</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Total EUR</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Total USD</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-creed-text">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-creed-text">Actions</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((container) => (
                  <tr
                    key={container.id}
                    className="border-b transition-colors hover:bg-creed-primary/5"
                    style={{
                      borderColor: '#2d3748',
                      opacity: isActionLoading('delete', container.id) ? 0.5 : 1
                    }}
                  >
                    <td className="px-4 py-2 text-creed-text text-sm">{container.containerNumber}</td>
                    <td className="px-4 py-2 text-creed-muted text-xs">
                      {new Date(container.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-creed-text text-sm">{container.supplierName}</td>
                    <td className="px-4 py-2">
                      <Tooltip
                        content={
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-3">
                              <Package className="w-4 h-4 text-creed-primary" />
                              <span className="text-xs font-semibold text-creed-text-bright">Container Products</span>
                            </div>
                            <div className="space-y-2">
                              {container.products.map((product, idx) => (
                                <div key={idx} className="flex justify-between items-start gap-3 pb-2 border-b border-creed-primary/10 last:border-0 last:pb-0">
                                  <div className="flex-1">
                                    <div className="text-xs font-medium text-creed-text">{product.productName}</div>
                                    <div className="text-[10px] text-creed-muted mt-0.5">
                                      {product.quantityBags} bags × €{product.priceEUR.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="text-xs font-semibold text-creed-primary">
                                    €{product.lineTotal.toFixed(2)}
                                  </div>
                                </div>
                              ))}
                              {container.freightCostEUR > 0 && (
                                <div className="flex justify-between items-center pt-2 border-t border-creed-accent/20">
                                  <span className="text-xs text-creed-muted">Freight Cost</span>
                                  <span className="text-xs font-semibold text-creed-accent">
                                    €{container.freightCostEUR.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        }
                      >
                        <div className="flex items-center gap-1.5 cursor-help">
                          <Package className="w-3.5 h-3.5 text-creed-muted" />
                          <span className="text-xs text-creed-muted">
                            {container.products.length} {container.products.length === 1 ? 'product' : 'products'}
                          </span>
                        </div>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-2 text-right text-creed-text text-xs font-medium">
                      €{(container.grandTotalEUR || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-creed-accent text-xs font-medium">
                      ${(container.totalCostUSD || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        container.containerStatus === 'closed'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {container.containerStatus === 'closed' ? 'Closed' : 'Open'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditContainer(container.id)}
                          disabled={saveStatus === 'saving'}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-creed-accent hover:bg-creed-accent/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Edit container"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ id: container.id, containerNumber: container.containerNumber })}
                          disabled={isActionLoading('delete', container.id) || saveStatus === 'saving'}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-creed-danger hover:bg-creed-danger/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete container"
                        >
                          {isActionLoading('delete', container.id) ? (
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

      {/* Create Container Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm"
            onClick={() => {
              if (isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving') return;
              setIsModalOpen(false);
              resetForm();
            }}
          />

          {/* Modal */}
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="relative w-full max-w-5xl rounded-xl border shadow-2xl"
              style={{
                backgroundColor: '#151a21',
                borderColor: '#2d3748',
                borderWidth: '1px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: '#2d3748' }}>
                <div>
                  <h2 className="text-lg font-semibold text-creed-text-bright">
                    {isEditMode ? 'Edit Container' : 'New Container'}
                  </h2>
                  <p className="text-xs text-creed-muted mt-0.5">
                    {isEditMode ? 'Update shipment details' : 'Fill in shipment details'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving') return;
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                  className="text-creed-muted hover:text-creed-text transition-colors rounded-lg p-1.5 hover:bg-creed-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[calc(100vh-180px)] overflow-y-auto">
                {/* Section: Basic Information */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ContainerIcon className="w-3.5 h-3.5 text-creed-primary" />
                    <h3 className="text-xs font-semibold text-creed-text uppercase tracking-wide">Basic Information</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-creed-muted mb-1.5">
                        Date <span className="text-creed-danger">*</span>
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                        className="w-full px-3 py-1.5 text-sm rounded-md border transition-all focus:ring-1 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text"
                        style={{
                          backgroundColor: '#0d1117',
                          borderColor: '#2d3748',
                          borderWidth: '1px'
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-creed-muted mb-1.5">
                        Container Number <span className="text-creed-danger">*</span>
                      </label>
                      <input
                        type="text"
                        value={containerNumber}
                        onChange={(e) => setContainerNumber(e.target.value)}
                        placeholder="e.g., CONT-2024-001"
                        disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                        className="w-full px-3 py-1.5 text-sm rounded-md border transition-all focus:ring-1 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text placeholder-creed-muted/50"
                        style={{
                          backgroundColor: '#0d1117',
                          borderColor: '#2d3748',
                          borderWidth: '1px'
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-creed-muted mb-1.5">
                        Supplier <span className="text-creed-danger">*</span>
                      </label>
                      <select
                        value={supplierId}
                        onChange={(e) => {
                          setSupplierId(e.target.value);
                          setPaymentAllocations(new Map()); // Reset payment allocations when supplier changes
                        }}
                        disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                        className="w-full px-3 py-1.5 text-sm rounded-md border transition-all focus:ring-1 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text"
                        style={{
                          backgroundColor: '#0d1117',
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
                  </div>
                </div>

                {/* Section: Products */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-creed-accent" />
                      <h3 className="text-xs font-semibold text-creed-text uppercase tracking-wide">Product Lines</h3>
                    </div>
                    <button
                      type="button"
                      onClick={addProductRow}
                      disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-white bg-creed-secondary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Line
                    </button>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {productRows.map((row, index) => (
                      <div
                        key={row.id}
                        className="p-2.5 rounded-md border transition-all hover:border-creed-accent/30"
                        style={{
                          backgroundColor: '#0d1117',
                          borderColor: '#2d3748',
                          borderWidth: '1px'
                        }}
                      >
                        <div className="grid grid-cols-12 gap-2 items-end">
                          {/* Row Number */}
                          <div className="col-span-1 flex items-center justify-center pb-1">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-creed-accent/15 text-creed-accent font-semibold text-xs">
                              {index + 1}
                            </div>
                          </div>

                          {/* Product */}
                          <div className="col-span-5">
                            <label className="block text-[10px] font-medium text-creed-muted mb-1">
                              Product <span className="text-creed-danger">*</span>
                            </label>
                            <select
                              value={row.productId}
                              onChange={(e) => updateProductRow(row.id, 'productId', e.target.value)}
                              disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                              className="w-full px-2 py-1 text-xs rounded border transition-all focus:ring-1 focus:ring-creed-accent focus:border-creed-accent outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text"
                              style={{
                                backgroundColor: '#0a0e14',
                                borderColor: '#2d3748',
                                borderWidth: '1px'
                              }}
                              required
                            >
                              <option value="">Select product</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Quantity */}
                          <div className="col-span-2">
                            <label className="block text-[10px] font-medium text-creed-muted mb-1">
                              Qty (Bags) <span className="text-creed-danger">*</span>
                            </label>
                            <input
                              type="number"
                              value={row.quantityBags || ''}
                              onChange={(e) => updateProductRow(row.id, 'quantityBags', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="1"
                              placeholder="0"
                              disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                              className="w-full px-2 py-1 text-xs rounded border transition-all focus:ring-1 focus:ring-creed-accent focus:border-creed-accent outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text text-center"
                              style={{
                                backgroundColor: '#0a0e14',
                                borderColor: '#2d3748',
                                borderWidth: '1px'
                              }}
                              required
                            />
                          </div>

                          {/* Price */}
                          <div className="col-span-2">
                            <label className="block text-[10px] font-medium text-creed-muted mb-1">
                              Price (€) <span className="text-creed-danger">*</span>
                            </label>
                            <input
                              type="number"
                              value={row.priceEUR || ''}
                              onChange={(e) => updateProductRow(row.id, 'priceEUR', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                              className="w-full px-2 py-1 text-xs rounded border transition-all focus:ring-1 focus:ring-creed-accent focus:border-creed-accent outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text text-right"
                              style={{
                                backgroundColor: '#0a0e14',
                                borderColor: '#2d3748',
                                borderWidth: '1px'
                              }}
                              required
                            />
                          </div>

                          {/* Line Total */}
                          <div className="col-span-1">
                            <label className="block text-[10px] font-medium text-creed-muted mb-1">
                              Total
                            </label>
                            <div className="px-1.5 py-1 rounded border text-xs text-creed-accent font-semibold text-center" style={{
                              backgroundColor: '#0a0e14',
                              borderColor: '#00d9ff',
                              borderWidth: '1px'
                            }}>
                              €{calculateLineTotal(row.quantityBags, row.priceEUR).toFixed(2)}
                            </div>
                          </div>

                          {/* Remove Button */}
                          <div className="col-span-1 flex justify-center pb-1">
                            <button
                              type="button"
                              onClick={() => removeProductRow(row.id)}
                              disabled={productRows.length === 1 || isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                              className="p-1 rounded text-creed-danger hover:bg-creed-danger/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Remove product line"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section: Freight & Customs */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-creed-primary" />
                    <h3 className="text-xs font-semibold text-creed-text uppercase tracking-wide">Additional Costs</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-creed-muted mb-1.5">
                        Freight Cost (€) <span className="text-creed-danger">*</span>
                      </label>
                      <input
                        type="number"
                        value={freightCostEUR || ''}
                        onChange={(e) => setFreightCostEUR(parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                        className="w-full px-3 py-1.5 text-sm rounded-md border transition-all focus:ring-1 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text text-right font-medium"
                        style={{
                          backgroundColor: '#0d1117',
                          borderColor: '#2d3748',
                          borderWidth: '1px'
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-creed-muted mb-1.5">
                        Customs Duties ($)
                      </label>
                      <input
                        type="number"
                        value={customsDutiesUSD || ''}
                        onChange={(e) => setCustomsDutiesUSD(parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                        className="w-full px-3 py-1.5 text-sm rounded-md border transition-all focus:ring-1 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text text-right font-medium"
                        style={{
                          backgroundColor: '#0d1117',
                          borderColor: '#2d3748',
                          borderWidth: '1px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Payment Allocation */}
                {supplierId && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-creed-accent" />
                        <h3 className="text-xs font-semibold text-creed-text uppercase tracking-wide">Payment Allocation</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowQuickPayment(true)}
                        disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-white bg-creed-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Quick Payment
                      </button>
                    </div>

                    {availablePayments.length === 0 ? (
                      <div className="text-center py-6 rounded-lg border" style={{
                        backgroundColor: '#0d1117',
                        borderColor: '#2d3748',
                        borderWidth: '1px'
                      }}>
                        <p className="text-xs text-creed-muted">No unallocated payments available</p>
                        <button
                          type="button"
                          onClick={() => setShowQuickPayment(true)}
                          className="mt-2 text-xs text-creed-primary hover:text-creed-primary/80"
                        >
                          Create a payment first
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Allocated Payments */}
                        {Array.from(paymentAllocations.entries()).map(([paymentId, allocatedAmount]) => {
                          const payment = availablePayments.find(p => p.id === paymentId);
                          if (!payment) return null;

                          const availableAmount = getPaymentAvailableAmount(payment);

                          return (
                            <div
                              key={paymentId}
                              className="p-3 rounded-md border bg-creed-primary/5"
                              style={{ borderColor: '#00d9ff', borderWidth: '1px' }}
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-creed-text">
                                      {new Date(payment.date).toLocaleDateString()}
                                    </span>
                                    <span className="text-[10px] text-creed-muted">
                                      Available: €{availableAmount.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-creed-muted whitespace-nowrap">Allocate:</span>
                                    <input
                                      type="number"
                                      value={allocatedAmount || ''}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        setPaymentAllocationAmount(paymentId, Math.min(value, availableAmount));
                                      }}
                                      min="0"
                                      max={availableAmount}
                                      step="0.01"
                                      placeholder="0.00"
                                      disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                                      className="flex-1 px-2 py-1 text-xs rounded border transition-all focus:ring-1 focus:ring-creed-primary focus:border-creed-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed text-creed-text text-right font-semibold"
                                      style={{
                                        backgroundColor: '#0a0e14',
                                        borderColor: '#2d3748',
                                        borderWidth: '1px'
                                      }}
                                    />
                                    <span className="text-xs text-creed-text font-semibold">EUR</span>
                                  </div>
                                  <p className="text-[10px] text-creed-muted">
                                    Rate: {payment.exchangeRate.toFixed(4)} | Commission: {payment.commissionPercent}% | USD: ${((payment.amountUSD * (allocatedAmount / payment.amountEUR)) || 0).toFixed(2)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removePaymentAllocation(paymentId)}
                                  disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                                  className="p-1 rounded text-creed-danger hover:bg-creed-danger/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Remove payment"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Available Payments to Add */}
                        {availablePayments.filter(p => !paymentAllocations.has(p.id)).length > 0 && (
                          <div className="space-y-2">
                            <div className="text-[10px] text-creed-muted uppercase tracking-wide">Available Payments</div>
                            {availablePayments.filter(p => !paymentAllocations.has(p.id)).map((payment) => {
                              const availableAmount = getPaymentAvailableAmount(payment);
                              const proportionalUSD = payment.amountUSD * (availableAmount / payment.amountEUR);

                              return (
                                <div
                                  key={payment.id}
                                  className="p-2.5 rounded-md border bg-creed-bg-dark/30 hover:bg-creed-bg-dark/50 transition-all"
                                  style={{ borderColor: '#2d3748', borderWidth: '1px' }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-creed-text">
                                          {new Date(payment.date).toLocaleDateString()}
                                        </span>
                                        <span className="text-xs text-creed-text">
                                          €{availableAmount.toFixed(2)}
                                        </span>
                                        <span className="text-xs text-creed-accent font-semibold">
                                          ${proportionalUSD.toFixed(2)}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-creed-muted mt-0.5">
                                        Rate: {payment.exchangeRate.toFixed(4)} | Commission: {payment.commissionPercent}%
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => addPaymentAllocation(payment.id)}
                                      disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white bg-creed-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Add
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="p-2.5 rounded-md border" style={{
                        backgroundColor: '#0d1117',
                        borderColor: '#2d3748',
                        borderWidth: '1px'
                      }}>
                        <div className="text-[10px] text-creed-muted mb-0.5 uppercase tracking-wide">Allocated EUR</div>
                        <div className="text-sm font-bold text-creed-text">
                          €{calculateAllocatedEUR().toFixed(2)} / €{calculateFinalGrandTotalEUR().toFixed(2)}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-md border" style={{
                        backgroundColor: '#0d1117',
                        borderColor: '#2d3748',
                        borderWidth: '1px'
                      }}>
                        <div className="text-[10px] text-creed-muted mb-0.5 uppercase tracking-wide">Allocated USD</div>
                        <div className="text-sm font-bold text-creed-accent">
                          ${calculateAllocatedUSD().toFixed(2)}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-md border" style={{
                        backgroundColor: getRemainingContainerBalance() < 0 ? '#1e2d1e' : getRemainingContainerBalance() > 0 ? '#2d1e1e' : '#0d1117',
                        borderColor: getRemainingContainerBalance() < 0 ? '#4ade80' : getRemainingContainerBalance() > 0 ? '#ef4444' : '#2d3748',
                        borderWidth: '1px'
                      }}>
                        <div className="text-[10px] text-creed-muted mb-0.5 uppercase tracking-wide">
                          {getRemainingContainerBalance() < 0 ? 'Over-allocated' : getRemainingContainerBalance() > 0 ? 'Remaining' : 'Balanced'}
                        </div>
                        <div className={`text-sm font-bold ${
                          getRemainingContainerBalance() < 0 ? 'text-creed-success' : getRemainingContainerBalance() > 0 ? 'text-creed-danger' : 'text-creed-text'
                        }`}>
                          €{Math.abs(getRemainingContainerBalance()).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-creed-primary" />
                    <h3 className="text-xs font-semibold text-creed-text uppercase tracking-wide">Summary</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2.5 rounded-md border" style={{
                      backgroundColor: '#0d1117',
                      borderColor: '#2d3748',
                      borderWidth: '1px'
                    }}>
                      <div className="text-[10px] text-creed-muted mb-0.5 uppercase tracking-wide">Total EUR</div>
                      <div className="text-lg font-bold text-creed-text">
                        €{calculateFinalGrandTotalEUR().toFixed(2)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-md border" style={{
                      backgroundColor: '#0d1117',
                      borderColor: '#2d3748',
                      borderWidth: '1px'
                    }}>
                      <div className="text-[10px] text-creed-muted mb-0.5 uppercase tracking-wide">Total USD</div>
                      <div className="text-lg font-bold text-creed-accent">
                        ${(calculateAllocatedUSD() + customsDutiesUSD).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-md border" style={{
                      backgroundColor: '#0d1117',
                      borderColor: '#ff6b35',
                      borderWidth: '1px'
                    }}>
                      <div className="text-[10px] text-creed-primary mb-0.5 uppercase tracking-wide">Cost/Bag USD</div>
                      <div className="text-lg font-bold text-creed-primary">
                        ${calculateTotalBags(productRows.map(r => ({
                          productId: r.productId,
                          productName: '',
                          quantityBags: r.quantityBags,
                          priceEUR: r.priceEUR,
                          lineTotal: 0
                        }))) > 0
                          ? ((calculateAllocatedUSD() + customsDutiesUSD) / calculateTotalBags(productRows.map(r => ({
                              productId: r.productId,
                              productName: '',
                              quantityBags: r.quantityBags,
                              priceEUR: r.priceEUR,
                              lineTotal: 0
                            })))).toFixed(2)
                          : '0.00'
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: '#2d3748' }}>
                  <button
                    type="submit"
                    disabled={!isFormValid() || isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-sm text-white bg-creed-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isActionLoading(isEditMode ? 'update' : 'create') ? (
                      <>
                        <Spinner size="sm" />
                        {isEditMode ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <ContainerIcon className="w-4 h-4" />
                        {isEditMode ? 'Update Container' : 'Create Container'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    disabled={isActionLoading(isEditMode ? 'update' : 'create') || saveStatus === 'saving'}
                    className="px-4 py-2 rounded-md font-semibold text-sm text-creed-muted hover:text-creed-text hover:bg-creed-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Quick Payment Modal */}
      {showQuickPayment && (
        <Modal
          isOpen={showQuickPayment}
          onClose={() => setShowQuickPayment(false)}
          title="Quick Payment"
        >
          <div className="space-y-5">
            {/* Payment Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: '#2d3748' }}>
                <DollarSign className="w-4 h-4 text-creed-primary" />
                <h3 className="text-sm font-semibold text-creed-text-bright">Payment Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-creed-text mb-1.5">
                    Date <span className="text-creed-danger">*</span>
                  </label>
                  <input
                    type="date"
                    value={quickPaymentData.date}
                    onChange={(e) => setQuickPaymentData({ ...quickPaymentData, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none text-creed-text"
                    style={{
                      backgroundColor: '#151a21',
                      borderColor: '#2d3748',
                      borderWidth: '1px'
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-creed-text mb-1.5">
                    Amount (EUR) <span className="text-creed-danger">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-creed-muted text-sm">€</span>
                    <input
                      type="number"
                      value={quickPaymentData.amountEUR || ''}
                      onChange={(e) => setQuickPaymentData({ ...quickPaymentData, amountEUR: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none text-creed-text placeholder-creed-muted"
                      style={{
                        backgroundColor: '#151a21',
                        borderColor: '#2d3748',
                        borderWidth: '1px'
                      }}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Exchange Rate Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: '#2d3748' }}>
                <TrendingUp className="w-4 h-4 text-creed-primary" />
                <h3 className="text-sm font-semibold text-creed-text-bright">Exchange & Commission</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-creed-text mb-1.5">
                    Exchange Rate (EUR → USD) <span className="text-creed-danger">*</span>
                  </label>
                  <input
                    type="number"
                    value={quickPaymentData.exchangeRate || ''}
                    onChange={(e) => setQuickPaymentData({ ...quickPaymentData, exchangeRate: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.0001"
                    placeholder="1.1000"
                    className="w-full px-3 py-2 text-sm rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none text-creed-text placeholder-creed-muted"
                    style={{
                      backgroundColor: '#151a21',
                      borderColor: '#2d3748',
                      borderWidth: '1px'
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-creed-text mb-1.5">
                    Commission (%) <span className="text-creed-danger">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={quickPaymentData.commissionPercent || ''}
                      onChange={(e) => setQuickPaymentData({ ...quickPaymentData, commissionPercent: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      placeholder="2.00"
                      className="w-full pr-8 pl-3 py-2 text-sm rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none text-creed-text placeholder-creed-muted"
                      style={{
                        backgroundColor: '#151a21',
                        borderColor: '#2d3748',
                        borderWidth: '1px'
                      }}
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-creed-muted text-sm">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculated Amount */}
            <div className="p-4 rounded-lg border-2" style={{
              backgroundColor: '#0a0e14',
              borderColor: '#00d9ff'
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-creed-accent" />
                  <span className="text-sm font-medium text-creed-text">Final Amount (USD)</span>
                </div>
                <span className="text-xl font-bold text-creed-accent">
                  ${quickPaymentCalculatedUSD.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-creed-text mb-1.5">
                Notes <span className="text-creed-muted text-[10px]">(Optional)</span>
              </label>
              <textarea
                value={quickPaymentData.notes}
                onChange={(e) => setQuickPaymentData({ ...quickPaymentData, notes: e.target.value })}
                placeholder="Add transaction notes or reference number..."
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border transition-all focus:ring-2 focus:ring-creed-primary focus:border-creed-primary outline-none text-creed-text placeholder-creed-muted resize-none"
                style={{
                  backgroundColor: '#151a21',
                  borderColor: '#2d3748',
                  borderWidth: '1px'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleQuickPayment}
                disabled={!quickPaymentData.date || !quickPaymentData.amountEUR || !quickPaymentData.exchangeRate || isCreatingPayment}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm text-white bg-creed-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-button-3d"
              >
                {isCreatingPayment ? (
                  <>
                    <Spinner size="sm" />
                    Creating Payment...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create & Allocate
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowQuickPayment(false)}
                disabled={isCreatingPayment}
                className="px-4 py-2.5 rounded-lg font-semibold text-sm text-creed-text hover:bg-creed-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => {
          if (isActionLoading('delete', deleteConfirm?.id || '')) return;
          setDeleteConfirm(null);
        }}
        onConfirm={handleDeleteContainer}
        title="Delete Container"
        message={
          <>
            Are you sure you want to delete container <strong className="text-creed-text-bright">"{deleteConfirm?.containerNumber}"</strong>?
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

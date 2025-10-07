import { useState, useEffect } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { Payment, PaymentAllocation } from '../services/github/types';
import { githubDataManager } from '../services/githubDataManager';

interface ActionLoading {
  type: 'create' | 'update' | 'delete' | 'allocate';
  id?: string;
}

export function usePayments() {
  const { data, refreshKey } = useDataContext();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<ActionLoading | null>(null);

  useEffect(() => {
    setPayments(data.payments || []);
    setLoading(false);
  }, [data.payments, refreshKey]);

  const isActionLoading = (type: 'create' | 'update' | 'delete' | 'allocate', id?: string) => {
    if (!actionLoading) return false;
    if (actionLoading.type !== type) return false;
    if (id && actionLoading.id !== id) return false;
    return true;
  };

  const calculateAmountUSD = (
    amountEUR: number,
    exchangeRate: number,
    commissionPercent: number
  ): number => {
    return amountEUR * exchangeRate * (1 + commissionPercent / 100);
  };

  const createPayment = async (
    supplierId: string,
    supplierName: string,
    date: string,
    amountEUR: number,
    exchangeRate: number,
    commissionPercent: number,
    notes?: string
  ) => {
    setActionLoading({ type: 'create' });
    setError(null);

    try {
      const amountUSD = calculateAmountUSD(amountEUR, exchangeRate, commissionPercent);

      const newPayment: Payment = {
        id: `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date,
        supplierId,
        supplierName,
        amountEUR,
        exchangeRate,
        commissionPercent,
        amountUSD,
        allocations: [],
        unallocatedEUR: amountEUR,
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await githubDataManager.updateData('payments', [...payments, newPayment]);
      return { success: true, data: newPayment };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create payment';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setActionLoading(null);
    }
  };

  const updatePayment = async (
    paymentId: string,
    updates: Partial<Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'amountUSD' | 'unallocatedEUR'>>
  ) => {
    setActionLoading({ type: 'update', id: paymentId });
    setError(null);

    try {
      const payment = payments.find((p) => p.id === paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Recalculate USD if EUR, rate, or commission changed
      let amountUSD = payment.amountUSD;
      const newAmountEUR = updates.amountEUR ?? payment.amountEUR;
      const newRate = updates.exchangeRate ?? payment.exchangeRate;
      const newCommission = updates.commissionPercent ?? payment.commissionPercent;

      if (
        updates.amountEUR !== undefined ||
        updates.exchangeRate !== undefined ||
        updates.commissionPercent !== undefined
      ) {
        amountUSD = calculateAmountUSD(newAmountEUR, newRate, newCommission);
      }

      // Recalculate unallocated EUR
      const totalAllocatedEUR = payment.allocations.reduce(
        (sum, alloc) => sum + alloc.amountEUR,
        0
      );
      const unallocatedEUR = newAmountEUR - totalAllocatedEUR;

      const updatedPayment: Payment = {
        ...payment,
        ...updates,
        amountEUR: newAmountEUR,
        exchangeRate: newRate,
        commissionPercent: newCommission,
        amountUSD,
        unallocatedEUR,
        updatedAt: new Date().toISOString(),
      };

      const updatedPayments = payments.map((p) =>
        p.id === paymentId ? updatedPayment : p
      );
      await githubDataManager.updateData('payments', updatedPayments);
      return { success: true, data: updatedPayment };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update payment';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setActionLoading(null);
    }
  };

  const deletePayment = async (paymentId: string) => {
    setActionLoading({ type: 'delete', id: paymentId });
    setError(null);

    try {
      const payment = payments.find((p) => p.id === paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Check if payment has allocations
      if (payment.allocations.length > 0) {
        throw new Error(
          'Cannot delete payment with allocations. Remove allocations first.'
        );
      }

      const filteredPayments = payments.filter((p) => p.id !== paymentId);
      await githubDataManager.updateData('payments', filteredPayments);
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete payment';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setActionLoading(null);
    }
  };

  const allocateToContainer = async (
    paymentId: string,
    containerId: string,
    containerNumber: string,
    amountEUR: number
  ) => {
    setActionLoading({ type: 'allocate', id: paymentId });
    setError(null);

    try {
      const payment = payments.find((p) => p.id === paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (amountEUR > payment.unallocatedEUR) {
        throw new Error('Allocation amount exceeds unallocated EUR');
      }

      // Calculate proportional USD amount
      const proportion = amountEUR / payment.amountEUR;
      const amountUSD = payment.amountUSD * proportion;

      const newAllocation: PaymentAllocation = {
        containerId,
        containerNumber,
        amountEUR,
        amountUSD,
      };

      const updatedAllocations = [...payment.allocations, newAllocation];
      const totalAllocatedEUR = updatedAllocations.reduce(
        (sum, alloc) => sum + alloc.amountEUR,
        0
      );
      const unallocatedEUR = payment.amountEUR - totalAllocatedEUR;

      const updatedPayment: Payment = {
        ...payment,
        allocations: updatedAllocations,
        unallocatedEUR,
        updatedAt: new Date().toISOString(),
      };

      const updatedPayments = payments.map((p) =>
        p.id === paymentId ? updatedPayment : p
      );
      await githubDataManager.updateData('payments', updatedPayments);
      return { success: true, data: updatedPayment };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to allocate payment';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setActionLoading(null);
    }
  };

  const removeAllocation = async (paymentId: string, containerId: string) => {
    setActionLoading({ type: 'allocate', id: paymentId });
    setError(null);

    try {
      const payment = payments.find((p) => p.id === paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      const updatedAllocations = payment.allocations.filter(
        (alloc) => alloc.containerId !== containerId
      );

      const totalAllocatedEUR = updatedAllocations.reduce(
        (sum, alloc) => sum + alloc.amountEUR,
        0
      );
      const unallocatedEUR = payment.amountEUR - totalAllocatedEUR;

      const updatedPayment: Payment = {
        ...payment,
        allocations: updatedAllocations,
        unallocatedEUR,
        updatedAt: new Date().toISOString(),
      };

      const updatedPayments = payments.map((p) =>
        p.id === paymentId ? updatedPayment : p
      );
      await githubDataManager.updateData('payments', updatedPayments);
      return { success: true, data: updatedPayment };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to remove allocation';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setActionLoading(null);
    }
  };

  // Get payments for a specific supplier
  const getSupplierPayments = (supplierId: string) => {
    return payments.filter((p) => p.supplierId === supplierId);
  };

  // Get unallocated payments for a supplier
  const getUnallocatedPayments = (supplierId: string) => {
    return payments.filter(
      (p) => p.supplierId === supplierId && p.unallocatedEUR > 0
    );
  };

  return {
    payments,
    loading,
    error,
    createPayment,
    updatePayment,
    deletePayment,
    allocateToContainer,
    removeAllocation,
    getSupplierPayments,
    getUnallocatedPayments,
    isActionLoading,
    calculateAmountUSD,
  };
}

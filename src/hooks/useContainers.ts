import { useCallback, useState } from "react";
import { useGitHubData } from "./useGitHubData";
import { Container, ContainerProductLine, PaymentAllocation } from "../services/github/types";

export const useContainers = () => {
  const {
    data: containersData,
    loading,
    error,
    updateData: updateContainers,
    isOnline,
    refresh,
    forceSync,
  } = useGitHubData<Container>({
    dataType: "containers",
    immediate: true,
  });

  // Ensure containers is always an array
  const containers = containersData || [];

  // Action loading states
  const [actionLoading, setActionLoading] = useState<{
    action: string;
    id?: string;
  } | null>(null);

  // Helper: Generate unique ID
  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Helper: Check if specific action is loading
  const isActionLoading = (action: string, id?: string) => {
    if (!actionLoading) return false;
    return (
      actionLoading.action === action &&
      (id === undefined || actionLoading.id === id)
    );
  };

  // Helper: Calculate EUR totals
  const calculateGrandTotalEUR = (
    products: ContainerProductLine[],
    freightCostEUR: number
  ): number => {
    const productsTotal = products.reduce(
      (sum, product) => sum + product.lineTotal,
      0
    );
    return productsTotal + freightCostEUR;
  };

  // Helper: Calculate total bags in container
  const calculateTotalBags = (products: ContainerProductLine[]): number => {
    return products.reduce((sum, product) => sum + product.quantityBags, 0);
  };

  // Helper: Calculate payment status
  const calculatePaymentStatus = (
    grandTotalEUR: number,
    totalEURPaid: number
  ): 'unpaid' | 'partial' | 'paid' => {
    if (totalEURPaid === 0) return 'unpaid';
    if (totalEURPaid >= grandTotalEUR) return 'paid';
    return 'partial';
  };

  // Helper: Calculate final costs in USD
  const calculateFinalCosts = (
    totalUSDPaid: number,
    customsDutiesUSD: number,
    totalBags: number
  ) => {
    const totalCostUSD = totalUSDPaid + customsDutiesUSD;
    const costPerBagUSD = totalBags > 0 ? totalCostUSD / totalBags : 0;
    return { totalCostUSD, costPerBagUSD };
  };

  // CREATE operation
  const createContainer = useCallback(
    async (containerData: Omit<Container, "id" | "createdAt" | "updatedAt">) => {
      setActionLoading({ action: "create" });

      try {
        // Calculate EUR totals
        const productsTotalEUR = containerData.products.reduce(
          (sum, p) => sum + p.lineTotal,
          0
        );
        const grandTotalEUR = productsTotalEUR + containerData.freightCostEUR;

        // Calculate payment totals
        const totalEURPaid = containerData.paymentAllocations?.reduce(
          (sum, alloc) => sum + alloc.amountEUR,
          0
        ) || 0;
        const totalUSDPaid = containerData.paymentAllocations?.reduce(
          (sum, alloc) => sum + alloc.amountUSD,
          0
        ) || 0;

        // Calculate payment status
        const paymentStatus = calculatePaymentStatus(grandTotalEUR, totalEURPaid);

        // Calculate customs status
        const customsStatus = containerData.customsDutiesUSD > 0 ? 'paid' : 'pending';

        // Calculate final costs
        const totalBags = calculateTotalBags(containerData.products);
        const { totalCostUSD, costPerBagUSD } = calculateFinalCosts(
          totalUSDPaid,
          containerData.customsDutiesUSD || 0,
          totalBags
        );

        // Determine container status
        const containerStatus =
          paymentStatus === 'paid' && customsStatus === 'paid' ? 'closed' : 'open';

        const newContainer: Container = {
          id: generateId(),
          ...containerData,
          productsTotalEUR,
          grandTotalEUR,
          totalEURPaid,
          totalUSDPaid,
          totalCostUSD,
          costPerBagUSD,
          paymentStatus,
          customsStatus,
          containerStatus,
          paymentAllocations: containerData.paymentAllocations || [],
          customsDutiesUSD: containerData.customsDutiesUSD || 0,
          quantityAddedToStock: {}, // Initialize as empty object
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await updateContainers([...containers, newContainer]);
        return { success: true, data: newContainer };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [containers, updateContainers]
  );

  // READ operation (containers are already available via useGitHubData)
  const getContainerById = useCallback(
    (id: string) => {
      return containers.find((container) => container.id === id);
    },
    [containers]
  );

  // Get containers by supplier
  const getContainersBySupplierId = useCallback(
    (supplierId: string) => {
      return containers.filter((container) => container.supplierId === supplierId);
    },
    [containers]
  );

  // UPDATE operation
  const updateContainer = useCallback(
    async (id: string, updates: Partial<Container>) => {
      setActionLoading({ action: "update", id });

      try {
        const updatedContainers = containers.map((container) => {
          if (container.id !== id) return container;

          // Merge updates
          const merged = { ...container, ...updates, updatedAt: new Date().toISOString() };

          // Recalculate totals if products or freight changed
          const productsTotalEUR = merged.products.reduce(
            (sum, p) => sum + p.lineTotal,
            0
          );
          const grandTotalEUR = productsTotalEUR + merged.freightCostEUR;

          // Recalculate payment totals
          const totalEURPaid = merged.paymentAllocations?.reduce(
            (sum, alloc) => sum + alloc.amountEUR,
            0
          ) || 0;
          const totalUSDPaid = merged.paymentAllocations?.reduce(
            (sum, alloc) => sum + alloc.amountUSD,
            0
          ) || 0;

          // Recalculate statuses
          const paymentStatus = calculatePaymentStatus(grandTotalEUR, totalEURPaid);
          const customsStatus = merged.customsDutiesUSD > 0 ? 'paid' : 'pending';
          const containerStatus = paymentStatus === 'paid' && customsStatus === 'paid' ? 'closed' : 'open';

          // Recalculate final costs
          const totalBags = calculateTotalBags(merged.products);
          const { totalCostUSD, costPerBagUSD } = calculateFinalCosts(
            totalUSDPaid,
            merged.customsDutiesUSD || 0,
            totalBags
          );

          return {
            ...merged,
            productsTotalEUR,
            grandTotalEUR,
            totalEURPaid,
            totalUSDPaid,
            totalCostUSD,
            costPerBagUSD,
            paymentStatus,
            customsStatus,
            containerStatus,
          };
        });

        await updateContainers(updatedContainers);

        // Return the updated container
        const updatedContainer = updatedContainers.find(c => c.id === id);
        return { success: true, data: updatedContainer };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [containers, updateContainers]
  );

  // DELETE operation
  const deleteContainer = useCallback(
    async (id: string) => {
      setActionLoading({ action: "delete", id });

      try {
        const filteredContainers = containers.filter((container) => container.id !== id);
        await updateContainers(filteredContainers);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [containers, updateContainers]
  );

  return {
    // Data
    containers,
    loading,
    error,
    isOnline,

    // Action loading states
    actionLoading,
    isActionLoading,

    // Operations
    createContainer,
    getContainerById,
    getContainersBySupplierId,
    updateContainer,
    deleteContainer,

    // Utilities
    refresh,
    forceSync,
    calculateGrandTotalEUR,
    calculateTotalBags,
    calculatePaymentStatus,
    calculateFinalCosts,
  };
};

import { useCallback, useState } from "react";
import { useGitHubData } from "./useGitHubData";
import { StockAdjustment, Product } from "../services/github/types";
import { githubDataManager } from "../services/githubDataManager";

export const useStockAdjustments = () => {
  const {
    data: stockAdjustments,
    loading,
    error,
    updateData: updateStockAdjustments,
    isOnline,
    refresh,
    forceSync,
  } = useGitHubData<StockAdjustment>({
    dataType: "stockAdjustments",
    immediate: true,
  });

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

  // Helper: Calculate weighted average cost
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

  // CREATE stock adjustment operation
  const createStockAdjustment = useCallback(
    async (adjustmentData: {
      productId: string;
      productName: string;
      adjustmentType: StockAdjustment['adjustmentType'];
      quantityChange: number;
      reason: string;
      newStockCost?: number;
      createdBy?: string;
    }) => {
      setActionLoading({ action: "create" });

      try {
        // Get the current product
        const products = githubDataManager.getData('products') as Product[];
        const product = products.find(p => p.id === adjustmentData.productId);

        if (!product) {
          return { success: false, error: "Product not found" };
        }

        const currentQuantity = product.quantity || 0;
        const currentCost = product.costPerBagUSD || 0;
        const newQuantity = currentQuantity + adjustmentData.quantityChange;

        // Validation: cannot go negative
        if (newQuantity < 0) {
          return {
            success: false,
            error: `Cannot adjust stock below zero. Current stock: ${currentQuantity}, Adjustment: ${adjustmentData.quantityChange}`
          };
        }

        // Validation: reason is required
        if (!adjustmentData.reason.trim()) {
          return { success: false, error: "Reason is required for stock adjustments" };
        }

        // Calculate new cost based on adjustment type
        let newCost = currentCost;

        if (adjustmentData.quantityChange > 0) {
          // Increase: recalculate WAC if cost is provided
          if (adjustmentData.newStockCost !== undefined && adjustmentData.newStockCost > 0) {
            newCost = calculateWeightedAverageCost(
              currentQuantity,
              currentCost,
              adjustmentData.quantityChange,
              adjustmentData.newStockCost
            );
          }
          // If no cost provided, keep current WAC
        }
        // Decrease: always keep current WAC (preserves cost basis)

        // Create the adjustment record
        const newAdjustment: StockAdjustment = {
          id: generateId(),
          date: new Date().toISOString(),
          productId: adjustmentData.productId,
          productName: adjustmentData.productName,
          adjustmentType: adjustmentData.adjustmentType,
          quantityChange: adjustmentData.quantityChange,
          reason: adjustmentData.reason.trim(),
          systemQuantityBefore: currentQuantity,
          systemQuantityAfter: newQuantity,
          costPerBagUSD: currentCost,
          newStockCost: adjustmentData.newStockCost,
          createdBy: adjustmentData.createdBy,
          createdAt: new Date().toISOString(),
        };

        // Update product with new quantity and cost
        const updatedProducts = products.map(p =>
          p.id === adjustmentData.productId
            ? {
                ...p,
                quantity: newQuantity,
                costPerBagUSD: newCost,
                updatedAt: new Date().toISOString()
              }
            : p
        );

        // Batch update both stock adjustments and products
        githubDataManager.startBatchUpdate();
        await updateStockAdjustments([...stockAdjustments, newAdjustment]);
        await githubDataManager.updateData('products', updatedProducts, false);
        await githubDataManager.endBatchUpdate();

        return { success: true, data: newAdjustment };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [stockAdjustments, updateStockAdjustments]
  );

  // READ operation - get adjustments by product
  const getAdjustmentsByProduct = useCallback(
    (productId: string) => {
      return stockAdjustments
        .filter(adj => adj.productId === productId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    [stockAdjustments]
  );

  // READ operation - get single adjustment
  const getAdjustmentById = useCallback(
    (id: string) => {
      return stockAdjustments.find(adj => adj.id === id);
    },
    [stockAdjustments]
  );

  // DELETE operation
  const deleteStockAdjustment = useCallback(
    async (id: string) => {
      setActionLoading({ action: "delete", id });

      try {
        const filteredAdjustments = stockAdjustments.filter(adj => adj.id !== id);
        await updateStockAdjustments(filteredAdjustments);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [stockAdjustments, updateStockAdjustments]
  );

  return {
    // Data
    stockAdjustments,
    loading,
    error,
    isOnline,

    // Action loading states
    actionLoading,
    isActionLoading,

    // Operations
    createStockAdjustment,
    getAdjustmentsByProduct,
    getAdjustmentById,
    deleteStockAdjustment,

    // Utilities
    refresh,
    forceSync,
  };
};

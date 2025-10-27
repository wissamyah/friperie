import { useState, useEffect, useCallback } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { Sale, SaleProductLine, Product, CashTransaction, ProductSaleSummary } from '../services/github/types';
import { githubDataManager } from '../services/githubDataManager';

interface ActionLoading {
  type: 'create' | 'update' | 'delete';
  id?: string;
}

// Helper: Aggregate products from sale lines (handles duplicates)
interface AggregatedProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalAmount: number;
  prices: number[]; // Track unique prices
}

function aggregateProductsFromSale(saleProducts: SaleProductLine[]): Map<string, AggregatedProduct> {
  const aggregated = new Map<string, AggregatedProduct>();

  saleProducts.forEach((line) => {
    const existing = aggregated.get(line.productId);
    if (existing) {
      existing.totalQuantity += line.quantityBags;
      existing.totalAmount += line.lineTotal;
      // Track unique prices
      if (!existing.prices.includes(line.sellingPriceUSD)) {
        existing.prices.push(line.sellingPriceUSD);
      }
    } else {
      aggregated.set(line.productId, {
        productId: line.productId,
        productName: line.productName,
        totalQuantity: line.quantityBags,
        totalAmount: line.lineTotal,
        prices: [line.sellingPriceUSD],
      });
    }
  });

  return aggregated;
}

// Helper: Calculate product summary with average prices
function calculateProductSummary(saleProducts: SaleProductLine[]): ProductSaleSummary[] {
  const aggregated = aggregateProductsFromSale(saleProducts);
  const summary: ProductSaleSummary[] = [];

  aggregated.forEach((product) => {
    summary.push({
      productId: product.productId,
      productName: product.productName,
      totalQuantity: product.totalQuantity,
      averagePrice: product.totalAmount / product.totalQuantity, // Weighted average
      totalAmount: product.totalAmount,
      priceVariations: product.prices.length,
    });
  });

  return summary;
}

// Helper: Validate aggregated stock availability
function validateAggregatedStock(
  saleProducts: SaleProductLine[],
  availableProducts: Product[]
): { valid: boolean; error?: string } {
  const aggregated = aggregateProductsFromSale(saleProducts);

  for (const [productId, aggregatedProduct] of aggregated) {
    const product = availableProducts.find((p) => p.id === productId);

    if (!product) {
      return {
        valid: false,
        error: `Product ${aggregatedProduct.productName} not found`,
      };
    }

    if (product.quantity < aggregatedProduct.totalQuantity) {
      return {
        valid: false,
        error: `Insufficient stock for ${aggregatedProduct.productName}. Available: ${product.quantity}, Required: ${aggregatedProduct.totalQuantity}`,
      };
    }
  }

  return { valid: true };
}

export function useSales() {
  const { data, refreshKey } = useDataContext();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<ActionLoading | null>(null);

  useEffect(() => {
    // Sort sales by date (newest first), then by createdAt for same-day sales
    const sortedSales = [...(data.sales || [])].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA === dateB) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return dateB - dateA;
    });
    setSales(sortedSales);
    setProducts(data.products || []);
    setLoading(false);
  }, [data.sales, data.products, refreshKey]);

  const isActionLoading = (type: 'create' | 'update' | 'delete', id?: string) => {
    if (!actionLoading) return false;
    if (actionLoading.type !== type) return false;
    if (id && actionLoading.id !== id) return false;
    return true;
  };

  // Calculate balance for a new transaction by summing all existing transactions + new amount
  const calculateBalance = useCallback((amount: number, existingTransactions: CashTransaction[]): number => {
    return existingTransactions.reduce((sum, t) => sum + t.amount, 0) + amount;
  }, []);

  // Calculate balance for an updated transaction based on chronological position
  const calculateBalanceForUpdate = useCallback((
    amount: number,
    date: string,
    createdAt: string,
    currentId: string,
    allTransactions: CashTransaction[]
  ): number => {
    const transactionsBeforeThis = allTransactions.filter(t => {
      if (t.id === currentId) return false;
      const newDateTime = new Date(date).getTime();
      const tDateTime = new Date(t.date).getTime();
      if (tDateTime < newDateTime) return true;
      if (tDateTime === newDateTime) {
        return new Date(t.createdAt).getTime() < new Date(createdAt).getTime();
      }
      return false;
    });

    return transactionsBeforeThis.reduce((sum, t) => sum + t.amount, 0) + amount;
  }, []);

  // Recalculate all cash transaction balances chronologically
  const recalculateAllCashBalances = useCallback((transactions: CashTransaction[]): CashTransaction[] => {
    // Sort chronologically (oldest first) by date, then by createdAt
    const chronological = [...transactions].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA === dateB) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return dateA - dateB;
    });

    // Recalculate running balances
    let runningBalance = 0;
    return chronological.map(transaction => {
      runningBalance += transaction.amount;
      return {
        ...transaction,
        balance: runningBalance
      };
    });
  }, []);

  const createSale = useCallback(
    async (date: string, saleProducts: SaleProductLine[]) => {
      setActionLoading({ type: 'create' });
      setError(null);

      try {
        // Get fresh data from GitHub to avoid stale state
        const currentSales = githubDataManager.getData('sales') || [];
        const currentProducts = githubDataManager.getData('products') || [];
        const currentCashTransactions = githubDataManager.getData('cashTransactions') || [];

        // Validate stock availability (handles duplicate products correctly)
        const stockValidation = validateAggregatedStock(saleProducts, currentProducts);
        if (!stockValidation.valid) {
          throw new Error(stockValidation.error);
        }

        const totalAmountUSD = saleProducts.reduce((sum, p) => sum + p.lineTotal, 0);
        const productNames = saleProducts.map(p => p.productName).join(', ');
        const timestamp = new Date().toISOString();

        // Calculate product summary (includes average prices for duplicate products)
        const productSummary = calculateProductSummary(saleProducts);

        // Create sale record
        const newSale: Sale = {
          id: `sale-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date,
          products: saleProducts,
          productSummary,
          totalAmountUSD,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        // Create cash transaction
        const newCashTransaction: CashTransaction = {
          id: `cash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date,
          type: 'sale',
          amount: totalAmountUSD,
          balance: calculateBalance(totalAmountUSD, currentCashTransactions),
          description: `Sale: ${productNames}`,
          relatedSaleId: newSale.id,
          createdAt: timestamp,
        };

        // Update product quantities (aggregate duplicates correctly)
        const aggregatedProducts = aggregateProductsFromSale(saleProducts);
        const updatedProducts = currentProducts.map((product) => {
          const aggregated = aggregatedProducts.get(product.id);
          if (aggregated) {
            return {
              ...product,
              quantity: product.quantity - aggregated.totalQuantity,
              updatedAt: timestamp,
            };
          }
          return product;
        });

        // Batch update to GitHub
        githubDataManager.startBatchUpdate();
        await githubDataManager.updateData('sales', [...currentSales, newSale]);
        await githubDataManager.updateData('products', updatedProducts);
        await githubDataManager.updateData('cashTransactions', [...currentCashTransactions, newCashTransaction]);
        await githubDataManager.endBatchUpdate();

        return { success: true, data: newSale };
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to create sale';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setActionLoading(null);
      }
    },
    [calculateBalance]
  );

  const updateSale = useCallback(
    async (saleId: string, date: string, saleProducts: SaleProductLine[]) => {
      setActionLoading({ type: 'update', id: saleId });
      setError(null);

      try {
        // Get fresh data from GitHub to avoid stale state
        const currentSales = githubDataManager.getData('sales') || [];
        const currentProducts = githubDataManager.getData('products') || [];
        const currentCashTransactions = githubDataManager.getData('cashTransactions') || [];

        const originalSale = currentSales.find((s) => s.id === saleId);
        if (!originalSale) {
          throw new Error('Sale not found');
        }

        const relatedTransaction = currentCashTransactions.find((t) => t.relatedSaleId === saleId);
        if (!relatedTransaction) {
          throw new Error('Related cash transaction not found');
        }

        // STEP 1: Aggregate ORIGINAL sale quantities (restore stock first)
        const originalAggregated = aggregateProductsFromSale(originalSale.products);

        // STEP 2: Aggregate NEW sale quantities (what will be deducted)
        const newAggregated = aggregateProductsFromSale(saleProducts);

        // STEP 3: Calculate restored stock for each product and validate against new requirements
        const stockAdjustments = new Map<string, number>();

        // First, restore all original quantities
        for (const [productId, aggregated] of originalAggregated) {
          stockAdjustments.set(productId, aggregated.totalQuantity);
        }

        // Then, subtract new quantities
        for (const [productId, aggregated] of newAggregated) {
          const current = stockAdjustments.get(productId) || 0;
          stockAdjustments.set(productId, current - aggregated.totalQuantity);
        }

        // STEP 4: Validate stock availability with clear error messages
        for (const [productId, netAdjustment] of stockAdjustments) {
          const product = currentProducts.find((p) => p.id === productId);
          if (!product) {
            const productName = newAggregated.get(productId)?.productName || originalAggregated.get(productId)?.productName || 'Unknown';
            throw new Error(`Product "${productName}" not found`);
          }

          // Calculate what stock will be after reversal
          const originalQuantity = originalAggregated.get(productId)?.totalQuantity || 0;
          const newQuantity = newAggregated.get(productId)?.totalQuantity || 0;
          const restoredStock = product.quantity + originalQuantity;

          // Validate against new requirement
          if (restoredStock < newQuantity) {
            throw new Error(
              `Insufficient stock for "${product.name}". ` +
              `Current stock: ${product.quantity} bags. ` +
              `After reversing original sale: ${restoredStock} bags available. ` +
              `You need: ${newQuantity} bags.`
            );
          }

          // Also validate that the net adjustment won't result in negative stock
          if (product.quantity + netAdjustment < 0) {
            throw new Error(
              `Insufficient stock for "${product.name}". ` +
              `Current: ${product.quantity}, After update: ${product.quantity + netAdjustment}`
            );
          }
        }

        const totalAmountUSD = saleProducts.reduce((sum, p) => sum + p.lineTotal, 0);
        const productNames = saleProducts.map(p => p.productName).join(', ');
        const timestamp = new Date().toISOString();

        // Calculate product summary (includes average prices for duplicate products)
        const productSummary = calculateProductSummary(saleProducts);

        // Update sale record
        const updatedSale: Sale = {
          ...originalSale,
          date,
          products: saleProducts,
          productSummary,
          totalAmountUSD,
          updatedAt: timestamp,
        };

        // Update cash transaction
        const updatedCashTransaction: CashTransaction = {
          ...relatedTransaction,
          date,
          amount: totalAmountUSD,
          balance: 0, // Will be recalculated below
          description: `Sale: ${productNames}`,
        };

        // Replace the old transaction with the updated one
        const transactionsWithUpdate = currentCashTransactions.map((t) =>
          t.id === relatedTransaction.id ? updatedCashTransaction : t
        );

        // Recalculate ALL cash transaction balances to ensure consistency
        const recalculatedTransactions = recalculateAllCashBalances(transactionsWithUpdate);

        // Update products with net adjustments
        const updatedProducts = currentProducts.map((product) => {
          const adjustment = stockAdjustments.get(product.id);
          if (adjustment !== undefined && adjustment !== 0) {
            return {
              ...product,
              quantity: product.quantity + adjustment,
              updatedAt: timestamp,
            };
          }
          return product;
        });

        // Batch update to GitHub
        githubDataManager.startBatchUpdate();
        await githubDataManager.updateData('sales', currentSales.map((s) => s.id === saleId ? updatedSale : s));
        await githubDataManager.updateData('products', updatedProducts);
        await githubDataManager.updateData('cashTransactions', recalculatedTransactions);
        await githubDataManager.endBatchUpdate();

        return { success: true, data: updatedSale };
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to update sale';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setActionLoading(null);
      }
    },
    [recalculateAllCashBalances]
  );

  const deleteSale = useCallback(
    async (saleId: string) => {
      setActionLoading({ type: 'delete', id: saleId });
      setError(null);

      try {
        // Get fresh data from GitHub to avoid stale state
        const currentSales = githubDataManager.getData('sales') || [];
        const currentProducts = githubDataManager.getData('products') || [];
        const currentCashTransactions = githubDataManager.getData('cashTransactions') || [];

        const sale = currentSales.find((s) => s.id === saleId);
        if (!sale) {
          throw new Error('Sale not found');
        }

        const relatedTransaction = currentCashTransactions.find((t) => t.relatedSaleId === saleId);
        const timestamp = new Date().toISOString();

        // Restore product quantities (aggregate duplicates correctly)
        const aggregatedProducts = aggregateProductsFromSale(sale.products);
        const updatedProducts = currentProducts.map((product) => {
          const aggregated = aggregatedProducts.get(product.id);
          if (aggregated) {
            return {
              ...product,
              quantity: product.quantity + aggregated.totalQuantity,
              updatedAt: timestamp,
            };
          }
          return product;
        });

        // Batch update to GitHub
        githubDataManager.startBatchUpdate();
        await githubDataManager.updateData('sales', currentSales.filter((s) => s.id !== saleId));
        await githubDataManager.updateData('products', updatedProducts);
        if (relatedTransaction) {
          await githubDataManager.updateData('cashTransactions',
            currentCashTransactions.filter((t) => t.id !== relatedTransaction.id)
          );
        }
        await githubDataManager.endBatchUpdate();

        return { success: true };
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to delete sale';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  return {
    sales,
    loading,
    error,
    createSale,
    updateSale,
    deleteSale,
    isActionLoading,
  };
}

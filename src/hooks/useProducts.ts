import { useCallback, useState } from "react";
import { useGitHubData } from "./useGitHubData";
import { Product } from "../services/github/types";

export const useProducts = () => {
  const {
    data: products,
    loading,
    error,
    updateData: updateProducts,
    isOnline,
    refresh,
    forceSync,
  } = useGitHubData<Product>({
    dataType: "products",
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

  // CREATE operation
  const createProduct = useCallback(
    async (name: string) => {
      setActionLoading({ action: "create" });

      try {
        const newProduct: Product = {
          id: generateId(),
          name,
          quantity: 0, // Initialize with 0 stock
          costPerBagUSD: 0, // Initialize with 0 cost
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await updateProducts([...products, newProduct]);
        return { success: true, data: newProduct };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [products, updateProducts]
  );

  // READ operation (products are already available via useGitHubData)
  const getProductById = useCallback(
    (id: string) => {
      return products.find((product) => product.id === id);
    },
    [products]
  );

  // UPDATE operation
  const updateProduct = useCallback(
    async (id: string, updates: Partial<Product>) => {
      setActionLoading({ action: "update", id });

      try {
        const updatedProducts = products.map((product) =>
          product.id === id
            ? { ...product, ...updates, updatedAt: new Date().toISOString() }
            : product
        );

        await updateProducts(updatedProducts);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [products, updateProducts]
  );

  // DELETE operation
  const deleteProduct = useCallback(
    async (id: string) => {
      setActionLoading({ action: "delete", id });

      try {
        const filteredProducts = products.filter((product) => product.id !== id);
        await updateProducts(filteredProducts);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [products, updateProducts]
  );

  return {
    // Data
    products,
    loading,
    error,
    isOnline,

    // Action loading states
    actionLoading,
    isActionLoading,

    // Operations
    createProduct,
    getProductById,
    updateProduct,
    deleteProduct,

    // Utilities
    refresh,
    forceSync,
  };
};

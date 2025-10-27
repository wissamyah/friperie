import { githubDataManager } from './githubDataManager';
import { DataState } from './github/types';

export type DataTypeKey = 'products' | 'suppliers' | 'containers' | 'supplierLedger' | 'payments' | 'sales' | 'expenses' | 'cashTransactions' | 'stockAdjustments' | 'partners' | 'partnerTransactions';

export interface ResetOptions {
  dataTypes: DataTypeKey[];
}

class DataResetService {
  /**
   * Reset selected data types to empty arrays
   * This persists the deletion to GitHub
   */
  async resetData(options: ResetOptions): Promise<void> {
    const { dataTypes } = options;

    if (dataTypes.length === 0) {
      throw new Error('No data types selected for reset');
    }

    try {
      // Load fresh data from GitHub to get latest SHA
      console.log('🔄 [RESET] Loading fresh data from GitHub...');
      await githubDataManager.loadAllData(true, true);

      // Start batch update to ensure atomic save
      githubDataManager.startBatchUpdate();

      // Get current data state
      const currentProducts = githubDataManager.getData('products');
      const currentSuppliers = githubDataManager.getData('suppliers');
      const currentContainers = githubDataManager.getData('containers');
      const currentLedger = githubDataManager.getData('supplierLedger');
      const currentPayments = githubDataManager.getData('payments');
      const currentSales = githubDataManager.getData('sales');
      const currentExpenses = githubDataManager.getData('expenses');
      const currentCashTransactions = githubDataManager.getData('cashTransactions');
      const currentStockAdjustments = githubDataManager.getData('stockAdjustments');
      const currentPartners = githubDataManager.getData('partners');
      const currentPartnerTransactions = githubDataManager.getData('partnerTransactions');

      // Prepare updates for each data type
      const updates: Array<{ type: keyof DataState; data: any }> = [];

      if (dataTypes.includes('products')) {
        updates.push({ type: 'products', data: [] });
      } else {
        updates.push({ type: 'products', data: currentProducts });
      }

      if (dataTypes.includes('suppliers')) {
        updates.push({ type: 'suppliers', data: [] });
      } else {
        updates.push({ type: 'suppliers', data: currentSuppliers });
      }

      if (dataTypes.includes('containers')) {
        updates.push({ type: 'containers', data: [] });
      } else {
        updates.push({ type: 'containers', data: currentContainers });
      }

      if (dataTypes.includes('supplierLedger')) {
        updates.push({ type: 'supplierLedger', data: [] });
      } else {
        updates.push({ type: 'supplierLedger', data: currentLedger });
      }

      if (dataTypes.includes('payments')) {
        updates.push({ type: 'payments', data: [] });
      } else {
        updates.push({ type: 'payments', data: currentPayments });
      }

      if (dataTypes.includes('sales')) {
        updates.push({ type: 'sales', data: [] });
      } else {
        updates.push({ type: 'sales', data: currentSales });
      }

      if (dataTypes.includes('expenses')) {
        updates.push({ type: 'expenses', data: [] });
      } else {
        updates.push({ type: 'expenses', data: currentExpenses });
      }

      if (dataTypes.includes('cashTransactions')) {
        updates.push({ type: 'cashTransactions', data: [] });
      } else {
        updates.push({ type: 'cashTransactions', data: currentCashTransactions });
      }

      if (dataTypes.includes('stockAdjustments')) {
        updates.push({ type: 'stockAdjustments', data: [] });
      } else {
        updates.push({ type: 'stockAdjustments', data: currentStockAdjustments });
      }

      if (dataTypes.includes('partners')) {
        updates.push({ type: 'partners', data: [] });
      } else {
        updates.push({ type: 'partners', data: currentPartners });
      }

      if (dataTypes.includes('partnerTransactions')) {
        updates.push({ type: 'partnerTransactions', data: [] });
      } else {
        updates.push({ type: 'partnerTransactions', data: currentPartnerTransactions });
      }

      // Queue all updates
      for (const update of updates) {
        await githubDataManager.updateData(update.type, update.data, false);
      }

      // End batch update - saves ALL changes to GitHub in one commit
      await githubDataManager.endBatchUpdate();

      console.log('✅ Data reset completed successfully:', dataTypes);
    } catch (error) {
      console.error('❌ Data reset failed:', error);
      throw error;
    }
  }

  /**
   * Get counts for all data types
   */
  getDataCounts(): Record<DataTypeKey, number> {
    return {
      products: githubDataManager.getData('products')?.length || 0,
      suppliers: githubDataManager.getData('suppliers')?.length || 0,
      containers: githubDataManager.getData('containers')?.length || 0,
      supplierLedger: githubDataManager.getData('supplierLedger')?.length || 0,
      payments: githubDataManager.getData('payments')?.length || 0,
      sales: githubDataManager.getData('sales')?.length || 0,
      expenses: githubDataManager.getData('expenses')?.length || 0,
      cashTransactions: githubDataManager.getData('cashTransactions')?.length || 0,
      stockAdjustments: githubDataManager.getData('stockAdjustments')?.length || 0,
      partners: githubDataManager.getData('partners')?.length || 0,
      partnerTransactions: githubDataManager.getData('partnerTransactions')?.length || 0,
    };
  }
}

export const dataResetService = new DataResetService();

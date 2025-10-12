import { DataState } from "./types";

export class DataMerger {
  /**
   * Merges two data states, with local changes taking precedence
   */
  mergeDataStates(remote: DataState, local: DataState): DataState {
    return {
      products: this.mergeArrays(remote.products || [], local.products || []),
      suppliers: this.mergeArrays(remote.suppliers || [], local.suppliers || []),
      containers: this.mergeArrays(remote.containers || [], local.containers || []),
      supplierLedger: this.mergeArrays(remote.supplierLedger || [], local.supplierLedger || []),
      payments: this.mergeArrays(remote.payments || [], local.payments || []),
      sales: this.mergeArrays(remote.sales || [], local.sales || []),
      expenses: this.mergeArrays(remote.expenses || [], local.expenses || []),
      cashTransactions: this.mergeArrays(remote.cashTransactions || [], local.cashTransactions || []),
      partners: this.mergeArrays(remote.partners || [], local.partners || []),
      partnerTransactions: this.mergeArrays(remote.partnerTransactions || [], local.partnerTransactions || []),
      metadata: local.metadata || remote.metadata,
    };
  }

  /**
   * Merges two arrays by ID, local items override remote items
   */
  private mergeArrays<T extends { id: string }>(remote: T[], local: T[]): T[] {
    const merged = new Map<string, T>();

    // Add all remote items
    remote.forEach((item) => merged.set(item.id, item));

    // Override with local items (local wins)
    local.forEach((item) => merged.set(item.id, item));

    return Array.from(merged.values());
  }

  /**
   * Returns empty data state
   */
  getDefaultDataState(): DataState {
    return {
      products: [],
      suppliers: [],
      containers: [],
      supplierLedger: [],
      payments: [],
      sales: [],
      expenses: [],
      cashTransactions: [],
      partners: [],
      partnerTransactions: [],
    };
  }
}

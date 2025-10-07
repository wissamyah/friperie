// GitHub configuration
export interface GitHubConfig {
  owner: string; // Your GitHub username
  repo: string; // Your data repository name
  path: string; // Path to data.json (e.g., 'data/data.json')
  branch: string; // Usually 'main'
  token: string | null; // Personal access token
  apiBase: string; // 'https://api.github.com'
}

// Product entity
export interface Product {
  id: string;
  name: string;
  quantity: number; // Stock quantity in bags
  costPerBagUSD: number; // Weighted average cost per bag in USD
  createdAt: string;
  updatedAt: string;
}

// Supplier entity
export interface Supplier {
  id: string;
  name: string;
  balance: number; // Running balance in EUR
  createdAt: string;
  updatedAt: string;
}

// Container product line item
export interface ContainerProductLine {
  productId: string;
  productName: string; // Stored for historical reference
  quantityBags: number;
  priceEUR: number;
  lineTotal: number; // quantityBags * priceEUR
}

// Payment allocation to container
export interface PaymentAllocation {
  containerId: string;
  containerNumber: string;
  amountEUR: number; // How much of payment goes to this container
  amountUSD: number; // Proportional USD amount based on payment's exchange rate
}

// Payment entity
export interface Payment {
  id: string;
  date: string;
  supplierId: string;
  supplierName: string;
  amountEUR: number;
  exchangeRate: number; // USD per EUR (e.g., 1.10 means $1.10 per €1)
  commissionPercent: number; // e.g., 2 for 2%
  amountUSD: number; // Calculated: EUR × rate × (1 + commission/100)
  allocations: PaymentAllocation[]; // Containers this payment is allocated to
  unallocatedEUR: number; // Remaining EUR not assigned to containers
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Container entity
export interface Container {
  id: string;
  containerNumber: string;
  date: string; // ISO date string (ship date)
  supplierId: string;
  supplierName: string; // Stored for historical reference
  products: ContainerProductLine[];
  freightCostEUR: number; // Shipping/freight cost in EUR

  // Calculated EUR totals
  productsTotalEUR: number; // Sum of all product line totals
  grandTotalEUR: number; // Products + Freight

  // Payment tracking
  paymentAllocations: PaymentAllocation[]; // Payments assigned to this container
  totalEURPaid: number; // Sum of allocated EUR
  totalUSDPaid: number; // Sum of allocated USD (with their exchange rates)

  // Customs and final costs
  customsDutiesUSD: number; // Customs paid on arrival in USD
  totalCostUSD: number; // Total USD Paid + Customs
  costPerBagUSD: number; // Total USD / Total Bags

  // Status tracking
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  customsStatus: 'pending' | 'paid';
  containerStatus: 'open' | 'closed'; // Closed = fully paid + customs paid

  // Stock tracking for cost recalculation
  quantityAddedToStock?: {
    [productId: string]: {
      quantityAdded: number;
      stockBefore: number;
      costBefore: number;
    }
  }; // Tracks details when container was closed for cost recalculation

  createdAt: string;
  updatedAt: string;
}

// Sale product line item
export interface SaleProductLine {
  productId: string;
  productName: string; // Stored for historical reference
  quantityBags: number;
  sellingPriceUSD: number;
  lineTotal: number; // quantityBags * sellingPriceUSD
}

// Sale entity
export interface Sale {
  id: string;
  date: string; // ISO date string
  products: SaleProductLine[];
  totalAmountUSD: number; // Sum of all line totals
  createdAt: string;
  updatedAt: string;
}

// Supplier ledger entry types
export type LedgerEntryType = "container" | "payment";

// Supplier ledger entry
export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  supplierName: string; // Stored for historical reference
  type: LedgerEntryType;
  amount: number; // Negative for debits (containers), positive for credits (payments)
  balance: number; // Running balance after this transaction
  description: string;
  relatedContainerId?: string; // Link to container if type is "container"
  date: string; // ISO date string
  createdAt: string;
}

// Expense entity
export interface Expense {
  id: string;
  date: string; // ISO date string
  category: string; // e.g., "Rent", "Utilities", "Salaries", "Other"
  amountUSD: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// Cash transaction types
export type CashTransactionType = "sale" | "expense";

// Cash transaction entity
export interface CashTransaction {
  id: string;
  date: string; // ISO date string
  type: CashTransactionType;
  amount: number; // Positive for income (sales), negative for expenses
  balance: number; // Running balance after this transaction
  description: string;
  relatedSaleId?: string; // Link to sale if type is "sale"
  relatedExpenseId?: string; // Link to expense if type is "expense"
  createdAt: string;
}

// Data state structure - customize for your app
export interface DataState {
  products: Product[];
  suppliers: Supplier[];
  containers: Container[];
  supplierLedger: SupplierLedgerEntry[];
  payments: Payment[];
  sales: Sale[];
  expenses: Expense[];
  cashTransactions: CashTransaction[];
  metadata?: {
    lastUpdated: string;
    version: string;
  };
}

// Operation types for offline queue
export type OperationType = "create" | "update" | "delete" | "batch";

export interface QueuedOperation {
  id: string;
  type: OperationType;
  dataType: keyof DataState;
  data: any;
  timestamp: number;
}

// Save status types
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface SaveStatusState {
  status: SaveStatus;
  lastSaved: string | null;
  error: string | null;
}

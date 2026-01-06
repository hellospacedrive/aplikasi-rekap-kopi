
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS';

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  hpp?: number; // Cost of Goods Sold
}

export interface Rider {
  id: string;
  name: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export type ExpenseCategoryType = 'BAHAN_BAKU' | 'OPERASIONAL' | 'GAJI' | 'LAINNYA';

export interface ExpenseItem {
  id: string;
  name: string;
  category: ExpenseCategoryType; // To categorize expenses for Dashboard analytics
}

// NEW: For Bookkeeping (Pembukuan Belanja) Items
export interface BookkeepingItem {
  id: string;
  category: string; // e.g., 'Produksi', 'Sirup', 'Aset'
  name: string;     // e.g., 'Bubuk Kopi', 'Cup'
}

export interface StockOpnameRecord {
  itemId: string;
  itemName: string;
  category: string;
  qty: number;
  price: number;
  total: number;
}

export interface StockOpname {
  id: string;
  date: string;
  month: string; // YYYY-MM
  records: StockOpnameRecord[];
  totalValue: number;
  note?: string;
}

export interface Transaction {
  id: string;
  date: string; // ISO String
  type: TransactionType;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string;
  productId?: string; // Optional, if linked to a specific menu item
  // New fields for Recap History
  qty?: number;         // Total cups sold in this transaction/batch OR items bought
  actualCash?: number;  // User input for Cash on Hand
  variance?: number;    // Calculated difference
  riderName?: string;   // Name of the seller/rider
  category?: string;    // For Bookkeeping (Produksi, Sirup, Aset, etc) OR Expense Category
  mealCost?: number;    // Daily meal allowance for the rider (Metadata only, not expense)
  notes?: string;       // Custom notes for this transaction/recap
}

export interface Capital {
  initialCash: number;
  initialBank: number;
  initialCupStock?: number; // NEW: Initial stock for the month
  month: string; // Format YYYY-MM to track monthly capital
  ownerNote?: string; // NEW: Sticky note for owner/admin
}

export interface FinancialSummary {
  currentCash: number;
  currentBank: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  totalCupsMonth: number;
}

export interface BankReconciliation {
  id: string;
  date: string;
  manualQrisAmount: number;
  systemQrisAmount: number;
  variance: number;
  note?: string;
}

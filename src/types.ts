export interface InvoiceItem {
  id: string;
  name: string;
  qty: number;
  total: number;
  unitPrice: number;
  costPrice?: number;
}

export interface Invoice {
  id: string;
  number: number;
  customer: string;
  customerPhone?: string;
  date: string;
  time: string;
  timestamp: number;
  lastModified?: string;
  lastModifiedTimestamp?: number;
  items: InvoiceItem[];
  total: number;
  costTotal?: number;
  profit?: number;
  paymentType: 'cash' | 'credit'; // نقدي أو آجل
  notes?: string;
}

export interface ProductSuggestion {
  name: string;
  price: number;
  cost?: number;
  category?: string;
}

export interface CustomerTransaction {
  id: string;
  date: string;
  time: string;
  timestamp: number;
  type: 'invoice_credit' | 'payment' | 'initial_balance';
  amount: number; // For invoice_credit: +amount (debt). For payment: -amount (reduction).
  balanceAfter: number;
  invoiceNumber?: number;
  invoiceId?: string;
  notes?: string;
}

export interface CustomerAccount {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  balance: number; // positive = owed to store (مدين), 0 = cleared, negative = store owes customer
  createdAt: string;
  transactions: CustomerTransaction[];
}

export interface AppSettings {
  storeName: string;
  storeSubtitle: string;
  storePhone: string;
  address: string;
  currency: string;
  taxEnabled: boolean;
  taxRate: number;
  soundEnabled: boolean;
  thermalWidth: '58mm' | '80mm';
}

export type ActiveTab = 'pos' | 'customers' | 'history' | 'catalog' | 'settings' | 'reports';

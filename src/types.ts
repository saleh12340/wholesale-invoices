export interface InvoiceItem {
  id: string;
  name: string;
  qty: number;
  total: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  number: number;
  customer: string;
  customerPhone?: string;
  date: string;
  time: string;
  timestamp: number;
  items: InvoiceItem[];
  total: number;
  paymentType: 'cash' | 'credit'; // نقدي أو آجل
  notes?: string;
}

export interface ProductSuggestion {
  name: string;
  price: number;
  category?: string;
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

export type ActiveTab = 'pos' | 'history' | 'catalog' | 'settings';

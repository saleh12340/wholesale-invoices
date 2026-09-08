import React, { useState, useEffect, useRef } from 'react';
import { TopAppBar } from './components/TopAppBar';
import { QuickEntryCard } from './components/QuickEntryCard';
import { InvoiceItemsList } from './components/InvoiceItemsList';
import { InvoiceSummaryFooter } from './components/InvoiceSummaryFooter';
import { HistoryView } from './components/HistoryView';
import { ItemCatalogView } from './components/ItemCatalogView';
import { CustomersView } from './components/CustomersView';
import { SettingsView } from './components/SettingsView';
import { ThermalPrintReceipt } from './components/ThermalPrintReceipt';
import { ThermalPreviewModal } from './components/ThermalPreviewModal';
import { ExitConfirmModal } from './components/ExitConfirmModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AndroidToast } from './components/AndroidToast';

import { Invoice, InvoiceItem, AppSettings, ActiveTab, CustomerAccount, CustomerTransaction } from './types';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  INITIAL_SUGGESTIONS,
  INITIAL_PRICES,
  INITIAL_CUSTOMERS,
  generateWhatsAppMessage,
  parseArabicNumber,
} from './utils/arabic';
import { sound } from './utils/audio';
import { printThermalReceipt, printThermalReceiptViaNewWindow, printViaRawBT } from './utils/thermalPrinter';
import { printDirectWebBluetooth } from './utils/bluetoothPrinter';
import { renderReceiptToCanvas, downloadReceiptImage, shareReceiptImage } from './utils/receiptCanvas';
import {
  exportInvoiceToPdf,
  exportInvoiceToExcel,
  exportInvoiceToJpg,
  shareInvoiceToWhatsAppAsImage,
} from './utils/exportTools';
import { LogOut } from 'lucide-react';


const INITIAL_CUSTOMER_ACCOUNTS: CustomerAccount[] = [
  {
    id: 'c-1',
    name: 'أبو أحمد',
    phone: '777123456',
    balance: 14500,
    createdAt: '2026-09-01 10:30',
    notes: 'عميل الحارة - الرصيد السابق',
    transactions: [
      {
        id: 'tx-1-1',
        date: '2026-09-01',
        time: '10:30',
        timestamp: Date.now() - 6 * 86400000,
        type: 'initial_balance',
        amount: 14500,
        balanceAfter: 14500,
        notes: 'رصيد افتتاحي سابق',
      },
    ],
  },
  {
    id: 'c-2',
    name: 'صالح العمري',
    phone: '773456789',
    balance: 28000,
    createdAt: '2026-09-02 14:15',
    notes: 'حساب شهري',
    transactions: [
      {
        id: 'tx-2-1',
        date: '2026-09-02',
        time: '14:15',
        timestamp: Date.now() - 5 * 86400000,
        type: 'initial_balance',
        amount: 35000,
        balanceAfter: 35000,
        notes: 'رصيد سابق',
      },
      {
        id: 'tx-2-2',
        date: '2026-09-05',
        time: '18:40',
        timestamp: Date.now() - 2 * 86400000,
        type: 'payment',
        amount: -7000,
        balanceAfter: 28000,
        notes: 'سداد نقدي جزء من الحساب',
      },
    ],
  },
  {
    id: 'c-3',
    name: 'محمد علي',
    phone: '771987654',
    balance: 0,
    createdAt: '2026-09-03 09:00',
    notes: 'حساب مسدد بالكامل',
    transactions: [
      {
        id: 'tx-3-1',
        date: '2026-09-03',
        time: '09:00',
        timestamp: Date.now() - 4 * 86400000,
        type: 'invoice_credit',
        amount: 5200,
        balanceAfter: 5200,
        invoiceNumber: 1000,
        notes: 'فاتورة مواد غذائية',
      },
      {
        id: 'tx-3-2',
        date: '2026-09-04',
        time: '11:20',
        timestamp: Date.now() - 3 * 86400000,
        type: 'payment',
        amount: -5200,
        balanceAfter: 0,
        notes: 'سداد كامل الفاتورة نقداً',
      },
    ],
  },
  {
    id: 'c-4',
    name: 'أبو صالح',
    phone: '770112233',
    balance: 9300,
    createdAt: '2026-09-04 16:00',
    notes: 'عميل دائم',
    transactions: [
      {
        id: 'tx-4-1',
        date: '2026-09-04',
        time: '16:00',
        timestamp: Date.now() - 3 * 86400000,
        type: 'invoice_credit',
        amount: 9300,
        balanceAfter: 9300,
        invoiceNumber: 1002,
        notes: 'فاتورة آجل',
      },
    ],
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'بقالة العزي',
  storeSubtitle: 'للمواد الغذائية والاستهلاكية',
  storePhone: '',
  address: 'صنعاء - اليمن',
  currency: 'ر.ي',
  taxEnabled: false,
  taxRate: 0,
  soundEnabled: true,
  thermalWidth: '80mm',
};

export default function App() {
  // Application Data States
  const [invoiceNumber, setInvoiceNumber] = useState<number>(1001);
  const [customerName, setCustomerName] = useState<string>('عميل نقدي');
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [history, setHistory] = useState<Invoice[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);
  const [itemPrices, setItemPrices] = useState<Record<string, number>>(INITIAL_PRICES);
  const [customers, setCustomers] = useState<string[]>(INITIAL_CUSTOMERS);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>(INITIAL_CUSTOMER_ACCOUNTS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // UI Control States
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [isAppExited, setIsAppExited] = useState<boolean>(false);

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Real-time Clock
  const [dateStr, setDateStr] = useState<string>('');
  const [timeStr, setTimeStr] = useState<string>('');
  const [activePrintInvoice, setActivePrintInvoice] = useState<Invoice | null>(null);

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Load from LocalStorage (Compatible with original HTML format)
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('azizi_invoice_history');
      if (savedHistory) {
        try {
          const rawHistory: Invoice[] = JSON.parse(savedHistory);
          if (Array.isArray(rawHistory)) {
            // Sanitize history and repair any corrupted totals or concatenated strings
            const repairedHistory = rawHistory.map((inv) => {
              const cleanItems = (inv.items || []).map((it) => {
                const q = Math.max(0.001, Number(parseArabicNumber(it.qty)) || 1);
                let t = Math.round((Number(parseArabicNumber(it.total)) || 0) * 100) / 100;
                // If corrupted by concatenation (greater than 10 million for a grocery item)
                if (t > 10000000) {
                  const u = Number(parseArabicNumber(it.unitPrice));
                  if (u > 0 && u < 1000000) {
                    t = Math.round(u * q * 100) / 100;
                  } else {
                    t = 0;
                  }
                }
                const unitPrice = q > 0 ? Math.round((t / q) * 100) / 100 : 0;
                return {
                  ...it,
                  qty: q,
                  total: t,
                  unitPrice,
                };
              });

              // Accurately sum clean item totals
              const sumItems = cleanItems.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
              const totalVal = sumItems > 0 ? Math.round(sumItems * 100) / 100 : Math.round((Number(parseArabicNumber(inv.total)) || 0) * 100) / 100;
              const safeTotal = totalVal > 100000000 ? 0 : totalVal;

              return {
                ...inv,
                items: cleanItems,
                total: safeTotal,
              };
            });

            setHistory(repairedHistory);
            localStorage.setItem('azizi_invoice_history', JSON.stringify(repairedHistory));
          }
        } catch (parseErr) {
          console.error('History parse/repair error:', parseErr);
        }
      }

      const savedSuggestions = localStorage.getItem('azizi_items_suggestions');
      if (savedSuggestions) {
        const parsed = JSON.parse(savedSuggestions);
        if (Array.isArray(parsed)) {
          setSuggestions(Array.from(new Set([...INITIAL_SUGGESTIONS, ...parsed])));
        }
      }

      const savedCustomers = localStorage.getItem('azizi_customers_list');
      if (savedCustomers) {
        const parsedCust = JSON.parse(savedCustomers);
        if (Array.isArray(parsedCust)) {
          setCustomers(Array.from(new Set([...INITIAL_CUSTOMERS, ...parsedCust])));
        }
      }

      const savedCustomerAccounts = localStorage.getItem('azizi_customer_accounts');
      if (savedCustomerAccounts) {
        try {
          const parsedAccounts = JSON.parse(savedCustomerAccounts);
          if (Array.isArray(parsedAccounts) && parsedAccounts.length > 0) {
            setCustomerAccounts(parsedAccounts);
          }
        } catch (e) {
          console.error('Customer accounts parsing error:', e);
        }
      }

      const savedItemPrices = localStorage.getItem('azizi_item_prices');
      if (savedItemPrices) {
        setItemPrices({ ...INITIAL_PRICES, ...JSON.parse(savedItemPrices) });
      }

      const lastInvNum = localStorage.getItem('azizi_last_inv_num');
      if (lastInvNum) {
        const num = parseInt(lastInvNum, 10);
        if (!isNaN(num)) setInvoiceNumber(num);
      }

      const savedDarkMode = localStorage.getItem('azizi_dark_mode');
      if (savedDarkMode !== null) {
        const dark = JSON.parse(savedDarkMode);
        setIsDark(dark);
        if (dark) document.documentElement.classList.add('dark');
      }

      const savedSettings = localStorage.getItem('azizi_app_settings');
      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }

      // Restore active draft if available (prevents cashier losing unprinted items on app restart)
      const savedDraft = localStorage.getItem('azizi_active_draft');
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          if (Array.isArray(draft.items) && draft.items.length > 0) {
            setItems(draft.items);
          }
          if (draft.customerName) setCustomerName(draft.customerName);
          if (draft.paymentType) setPaymentType(draft.paymentType);
        } catch {}
      }

      // Check window width to set initial frame mode: on desktop default to phone frame, on mobile fullscreen
      if (window.innerWidth >= 768) {
        setIsPhoneFrame(true);
      }
    } catch (e) {
      console.error('Storage loading error:', e);
    }
  }, []);

  // 2. Real-time Date and Time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const d = now.toLocaleDateString('ar-YE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const t = now.toLocaleTimeString('ar-YE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setDateStr(d);
      setTimeStr(t);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Auto-save active draft to localStorage
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem('azizi_active_draft', JSON.stringify({ items, customerName, paymentType }));
    } else {
      localStorage.removeItem('azizi_active_draft');
    }
  }, [items, customerName, paymentType]);

  // Save changes to localStorage helper
  const persistData = (
    updatedHistory?: Invoice[],
    updatedSuggestions?: string[],
    updatedCustomers?: string[],
    updatedPrices?: Record<string, number>,
    updatedLastInv?: number
  ) => {
    try {
      if (updatedHistory) {
        localStorage.setItem('azizi_invoice_history', JSON.stringify(updatedHistory));
      }
      if (updatedSuggestions) {
        localStorage.setItem('azizi_items_suggestions', JSON.stringify(updatedSuggestions));
      }
      if (updatedCustomers) {
        localStorage.setItem('azizi_customers_list', JSON.stringify(updatedCustomers));
      }
      if (updatedPrices) {
        localStorage.setItem('azizi_item_prices', JSON.stringify(updatedPrices));
      }
      if (updatedLastInv !== undefined) {
        localStorage.setItem('azizi_last_inv_num', updatedLastInv.toString());
      }
    } catch (e) {
      console.error('Storage saving error:', e);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage({ msg, type });
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Double-tap phone hardware / system back button detection (User requirement: عند الخروج بزر الهاتف نفسه بالضغط عليه مرتين يظهر تأكيد الخروج)
  const lastBackPressTimeRef = useRef<number>(0);
  const backPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stateRef = useRef({
    previewModalOpen,
    confirmDialogOpen: confirmDialog.isOpen,
    isExitModalOpen,
    activeTab,
  });

  useEffect(() => {
    stateRef.current = {
      previewModalOpen,
      confirmDialogOpen: confirmDialog.isOpen,
      isExitModalOpen,
      activeTab,
    };
  }, [previewModalOpen, confirmDialog.isOpen, isExitModalOpen, activeTab]);

  // Handler for device back button (Physical phone back button, Android gesture, or on-screen back button)
  const handleDeviceBackButton = () => {
    // 1. If Preview modal is open, close it
    if (stateRef.current.previewModalOpen) {
      setPreviewModalOpen(false);
      return;
    }
    // 2. If Confirm dialog is open, close it
    if (stateRef.current.confirmDialogOpen) {
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      return;
    }
    // 3. If Exit modal is already open, close it
    if (stateRef.current.isExitModalOpen) {
      setIsExitModalOpen(false);
      return;
    }
    // 4. If user is in a sub-tab (History, Customers, Catalog, Settings), Back button returns to POS
    if (stateRef.current.activeTab !== 'pos') {
      sound.playTap();
      setActiveTab('pos');
      return;
    }

    // 5. Double-tap detection for application exit on POS main screen
    const now = Date.now();
    const elapsed = now - lastBackPressTimeRef.current;

    if (elapsed > 0 && elapsed < 2000) {
      // Second tap within 2 seconds: Open exit confirmation modal!
      lastBackPressTimeRef.current = 0;
      if (backPressTimerRef.current) {
        clearTimeout(backPressTimerRef.current);
      }
      sound.playTap();
      setIsExitModalOpen(true);
    } else {
      // First tap: prompt user to tap once more to confirm exit
      lastBackPressTimeRef.current = now;
      sound.playTap();
      showToast('اضغط زر الرجوع مرة أخرى لتأكيد الخروج من التطبيق', 'info');

      if (backPressTimerRef.current) {
        clearTimeout(backPressTimerRef.current);
      }
      backPressTimerRef.current = setTimeout(() => {
        lastBackPressTimeRef.current = 0;
      }, 2000);
    }
  };

  // Hardware Back Button listener via Capacitor Native Android, Cordova, HTML5 History popstate & keyboard Escape
  useEffect(() => {
    try {
      window.history.pushState({ app: 'al-ezzi-pos' }, '', window.location.href);
    } catch {
      // ignore
    }

    // 1. Capacitor Native Android Back Button Listener
    let capListenerHandle: any = null;
    try {
      CapApp.addListener('backButton', () => {
        handleDeviceBackButton();
      }).then((handle) => {
        capListenerHandle = handle;
      }).catch((e) => {
        console.warn('Capacitor backButton error:', e);
      });
    } catch (e) {
      console.warn('CapApp listener init exception:', e);
    }

    // 2. Cordova / Android WebView backbutton event
    const onCordovaBack = (e: Event) => {
      e.preventDefault();
      handleDeviceBackButton();
    };
    document.addEventListener('backbutton', onCordovaBack, false);

    // 3. Web & PWA popstate history trap
    const onPopState = () => {
      try {
        window.history.pushState({ app: 'al-ezzi-pos' }, '', window.location.href);
      } catch {
        // ignore
      }
      handleDeviceBackButton();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'GoBack' || e.keyCode === 27) {
        e.preventDefault();
        handleDeviceBackButton();
      }
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      if (capListenerHandle && typeof capListenerHandle.remove === 'function') {
        capListenerHandle.remove();
      }
      document.removeEventListener('backbutton', onCordovaBack);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKeyDown);
      if (backPressTimerRef.current) {
        clearTimeout(backPressTimerRef.current);
      }
    };
  }, []);

  // Grand Total calculation (Strict numerical addition preventing any string concatenation)
  const grandTotal = items.reduce((sum, item) => {
    const itemTotal = Number(parseArabicNumber(item.total)) || 0;
    return Math.round((sum + itemTotal) * 100) / 100;
  }, 0);

  // Construct active invoice object for preview and thermal printing
  const currentInvoiceObj: Invoice = {
    id: `inv-${invoiceNumber}`,
    number: invoiceNumber,
    customer: customerName || 'عميل نقدي',
    date: dateStr || new Date().toLocaleDateString('ar-YE'),
    time: timeStr || new Date().toLocaleTimeString('ar-YE'),
    timestamp: Date.now(),
    items: [...items],
    total: grandTotal,
    paymentType,
  };

  // Add or Update item in active invoice
  const handleAddItem = (name: string, qty: number, total: number) => {
    const cleanQty = Math.max(0.001, Number(parseArabicNumber(qty)) || 1);
    const cleanTotal = Math.round((Number(parseArabicNumber(total)) || 0) * 100) / 100;
    const unitPrice = cleanQty > 0 ? Math.round((cleanTotal / cleanQty) * 100) / 100 : 0;

    if (editingIndex !== null && editingIndex >= 0 && editingIndex < items.length) {
      const updated = [...items];
      updated[editingIndex] = {
        ...updated[editingIndex],
        name,
        qty: cleanQty,
        total: cleanTotal,
        unitPrice,
      };
      setItems(updated);
      setEditingIndex(null);
      showToast(`تم تحديث الصنف: ${name}`);
    } else {
      const newItem: InvoiceItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name,
        qty: cleanQty,
        total: cleanTotal,
        unitPrice,
      };
      setItems((prev) => [...prev, newItem]);
      showToast(`تمت إضافة: ${name}`);
    }

    // Auto-save item name and price in suggestions catalog
    if (name && name !== 'صنف بدون اسم') {
      const cleanName = name.trim();
      let nextSuggestions = suggestions;
      if (!suggestions.includes(cleanName)) {
        nextSuggestions = [cleanName, ...suggestions];
        setSuggestions(nextSuggestions);
      }
      const nextPrices = { ...itemPrices, [cleanName]: unitPrice > 0 ? unitPrice : cleanTotal };
      setItemPrices(nextPrices);
      persistData(undefined, nextSuggestions, undefined, nextPrices);
    }
  };

  // Save current customer to customer suggestions
  const recordCustomerName = (cName: string) => {
    if (!cName || cName.trim() === '' || cName === 'عميل نقدي') return;
    const clean = cName.trim();
    if (!customers.includes(clean)) {
      const nextCust = [clean, ...customers];
      setCustomers(nextCust);
      persistData(undefined, undefined, nextCust);
    }
  };

  // Edit item row
  const handleEditItem = (index: number) => {
    setEditingIndex(index);
    setActiveTab('pos');
  };

  // Delete item row
  const handleDeleteItem = (index: number) => {
    const deletedName = items[index]?.name || 'الصنف';
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    if (editingIndex === index) setEditingIndex(null);
    showToast(`تم حذف ${deletedName}`, 'info');
  };

  // Save invoice to History
  const handleSaveInvoice = () => {
    if (items.length === 0) {
      showToast('الفاتورة فارغة، يرجى إضافة أصناف أولاً', 'error');
      return;
    }

    recordCustomerName(customerName);

    const nowStrDate = dateStr || new Date().toLocaleDateString('ar-YE');
    const nowStrTime = timeStr || new Date().toLocaleTimeString('ar-YE');

    const invoiceToSave: Invoice = {
      id: `inv-${invoiceNumber}-${Date.now()}`,
      number: invoiceNumber,
      customer: customerName || 'عميل نقدي',
      date: nowStrDate,
      time: nowStrTime,
      timestamp: Date.now(),
      items: [...items],
      total: grandTotal,
      paymentType,
    };

    const existingIndex = history.findIndex((h) => h.number === invoiceNumber);
    let nextHistory: Invoice[];

    if (existingIndex !== -1) {
      nextHistory = [...history];
      nextHistory[existingIndex] = invoiceToSave;
      showToast(`تم تحديث الفاتورة #${invoiceNumber} في السجل بنجاح!`);
    } else {
      nextHistory = [invoiceToSave, ...history];
      showToast(`تم حفظ الفاتورة #${invoiceNumber} في السجل بنجاح!`);
    }

    setHistory(nextHistory);
    persistData(nextHistory, undefined, undefined, undefined, invoiceNumber);

    // If credit invoice, automatically record to customer ledger
    if (paymentType === 'credit' && customerName.trim() && customerName.trim() !== 'عميل نقدي') {
      const cName = customerName.trim();
      const existing = customerAccounts.find((c) => c.name.toLowerCase() === cName.toLowerCase());
      let nextAccounts: CustomerAccount[];

      const tx: CustomerTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: nowStrDate,
        time: nowStrTime,
        timestamp: Date.now(),
        type: 'invoice_credit',
        amount: grandTotal,
        balanceAfter: (existing ? existing.balance : 0) + grandTotal,
        invoiceNumber,
        invoiceId: invoiceToSave.id,
        notes: `فاتورة مبيعات آجل #${invoiceNumber} (${items.length} أصناف)`,
      };

      if (existing) {
        nextAccounts = customerAccounts.map((c) => {
          if (c.id !== existing.id) return c;
          const newBal = c.balance + grandTotal;
          return {
            ...c,
            balance: newBal,
            transactions: [tx, ...c.transactions],
          };
        });
      } else {
        const newCust: CustomerAccount = {
          id: `cust-${Date.now()}`,
          name: cName,
          balance: grandTotal,
          createdAt: `${nowStrDate} ${nowStrTime}`,
          transactions: [tx],
        };
        nextAccounts = [newCust, ...customerAccounts];
      }
      setCustomerAccounts(nextAccounts);
      localStorage.setItem('azizi_customer_accounts', JSON.stringify(nextAccounts));
    }

    sound.playSuccess();
  };

  // Customer Management Handlers
  const handleAddCustomer = (newCust: { name: string; phone?: string; initialBalance?: number; notes?: string }) => {
    const id = `cust-${Date.now()}`;
    const nowStrDate = dateStr || new Date().toLocaleDateString('ar-YE');
    const nowStrTime = timeStr || new Date().toLocaleTimeString('ar-YE');
    const initBal = newCust.initialBalance || 0;
    const initialTransactions: CustomerTransaction[] = initBal !== 0 ? [
      {
        id: `tx-${Date.now()}`,
        date: nowStrDate,
        time: nowStrTime,
        timestamp: Date.now(),
        type: 'initial_balance',
        amount: initBal,
        balanceAfter: initBal,
        notes: 'رصيد افتتاحي سابق',
      }
    ] : [];

    const account: CustomerAccount = {
      id,
      name: newCust.name.trim(),
      phone: newCust.phone?.trim(),
      balance: initBal,
      notes: newCust.notes?.trim(),
      createdAt: `${nowStrDate} ${nowStrTime}`,
      transactions: initialTransactions,
    };

    const updated = [account, ...customerAccounts];
    setCustomerAccounts(updated);
    localStorage.setItem('azizi_customer_accounts', JSON.stringify(updated));

    if (!customers.includes(account.name)) {
      const nextCustomers = [account.name, ...customers];
      setCustomers(nextCustomers);
      localStorage.setItem('azizi_customers_list', JSON.stringify(nextCustomers));
    }

    showToast(`تمت إضافة العميل "${account.name}" بنجاح`);
    sound.playSuccess();
  };

  const handleAddCustomerPayment = (customerId: string, amount: number, notes?: string) => {
    const nowStrDate = dateStr || new Date().toLocaleDateString('ar-YE');
    const nowStrTime = timeStr || new Date().toLocaleTimeString('ar-YE');

    const updated = customerAccounts.map((c) => {
      if (c.id !== customerId) return c;
      const newBalance = c.balance - amount;
      const tx: CustomerTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: nowStrDate,
        time: nowStrTime,
        timestamp: Date.now(),
        type: 'payment',
        amount: -amount,
        balanceAfter: newBalance,
        notes: notes?.trim() || 'سند قبض / سداد نقدي',
      };
      return {
        ...c,
        balance: newBalance,
        transactions: [tx, ...c.transactions],
      };
    });

    setCustomerAccounts(updated);
    localStorage.setItem('azizi_customer_accounts', JSON.stringify(updated));
    showToast(`تم تسجيل دفعة سداد بمبلغ ${amount} ${settings.currency}`);
    sound.playSuccess();
  };

  const handleDeleteCustomer = (customerId: string) => {
    const target = customerAccounts.find((c) => c.id === customerId);
    setConfirmDialog({
      isOpen: true,
      title: 'حذف حساب العميل',
      message: `هل أنت متأكد من حذف حساب العميل "${target?.name || ''}" نهائياً مع كافة سجلات عملياته؟`,
      isDangerous: true,
      onConfirm: () => {
        const updated = customerAccounts.filter((c) => c.id !== customerId);
        setCustomerAccounts(updated);
        localStorage.setItem('azizi_customer_accounts', JSON.stringify(updated));
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast(`تم حذف حساب العميل بنجاح`);
        sound.playTrash();
      },
    });
  };

  const handleSelectCustomerForInvoice = (name: string) => {
    setCustomerName(name);
    setActiveTab('pos');
    showToast(`تم اختيار "${name}" للفاتورة`);
  };

  // Restore invoice from history to active editor (strictly sanitized)
  const handleRestoreInvoice = (inv: Invoice) => {
    const cleanItems = (inv.items || []).map((it) => {
      const q = Math.max(0.001, Number(parseArabicNumber(it.qty)) || 1);
      let t = Math.round((Number(parseArabicNumber(it.total)) || 0) * 100) / 100;
      if (t > 10000000) {
        const u = Number(parseArabicNumber(it.unitPrice));
        if (u > 0 && u < 1000000) t = Math.round(u * q * 100) / 100;
        else t = 0;
      }
      const unitPrice = q > 0 ? Math.round((t / q) * 100) / 100 : 0;
      return {
        ...it,
        qty: q,
        total: t,
        unitPrice,
      };
    });

    setItems(cleanItems);
    setInvoiceNumber(inv.number);
    setCustomerName(inv.customer || 'عميل نقدي');
    setPaymentType(inv.paymentType || 'cash');
    setEditingIndex(null);
    setActiveTab('pos');
    showToast(`تم فتح الفاتورة #${inv.number} للتعديل والاستكمال`);
  };

  // Delete single invoice from history
  const handleDeleteHistoryInvoice = (invNum: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'حذف الفاتورة من السجل',
      message: `هل أنت متأكد من حذف الفاتورة رقم #${invNum} نهائياً؟`,
      isDangerous: true,
      onConfirm: () => {
        const nextHistory = history.filter((h) => h.number !== invNum);
        setHistory(nextHistory);
        persistData(nextHistory);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast(`تم حذف الفاتورة #${invNum} من السجل`);
      },
    });
  };

  // Clear entire history
  const handleClearAllHistory = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'مسح السجل التاريخي بالكامل',
      message: 'تحذير: سيتم حذف جميع الفواتير المحفوظة في السجل. هذا الإجراء لا يمكن التراجع عنه!',
      isDangerous: true,
      onConfirm: () => {
        setHistory([]);
        persistData([]);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('تم مسح سجل الفواتير بالكامل');
      },
    });
  };

  // Reset / New Invoice
  const handleResetInvoice = () => {
    if (items.length === 0) {
      doResetInvoice();
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'بدء فاتورة جديدة',
      message: 'هل تريد إخلاء الشاشة والبدء بفاتورة جديدة برقم تسلسلي جديد؟',
      onConfirm: () => {
        doResetInvoice();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const doResetInvoice = () => {
    const nextNum = invoiceNumber + 1;
    setItems([]);
    setEditingIndex(null);
    setInvoiceNumber(nextNum);
    setCustomerName('عميل نقدي');
    setPaymentType('cash');
    persistData(undefined, undefined, undefined, undefined, nextNum);
    showToast(`تمت تهيئة فاتورة جديدة #${nextNum}`);
  };

  // Multi-tier thermal print: Direct Spooler with instant print dialog
  const handlePrint = (targetInv?: Invoice) => {
    const inv = targetInv || currentInvoiceObj;
    if (!inv || inv.items.length === 0) {
      showToast('لا توجد أصناف لطباعتها', 'error');
      return;
    }
    if (!targetInv) recordCustomerName(customerName);
    setActivePrintInvoice(inv);
    showToast('جاري بدء الطباعة الحرارية...');
    setTimeout(() => {
      printThermalReceipt(inv, {
        storeName: settings.storeName,
        storeSubtitle: settings.storeSubtitle,
        storePhone: settings.storePhone,
        currency: settings.currency,
        thermalWidth: settings.thermalWidth,
      });
    }, 50);
  };

  // Direct Bluetooth ESC/POS Print: Web Bluetooth -> RawBT Intent fallback
  const handlePrintBluetooth = async () => {
    if (items.length === 0) {
      showToast('لا توجد أصناف لطباعتها', 'error');
      return;
    }
    recordCustomerName(customerName);

    // If browser supports Web Bluetooth, try direct connection first
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      showToast('جاري البحث عن طابعة البلوتوث...');
      try {
        const res = await printDirectWebBluetooth(currentInvoiceObj, {
          storeName: settings.storeName,
          storeSubtitle: settings.storeSubtitle,
          storePhone: settings.storePhone,
          currency: settings.currency,
        });
        if (res.success) {
          showToast(res.message);
          sound.playSuccess();
          return;
        } else {
          showToast(res.message, 'info');
        }
      } catch (err) {
        console.warn('Web Bluetooth cancelled or failed, falling back to RawBT:', err);
      }
    }

    // Fallback: Send to RawBT Android application
    const ok = printViaRawBT(currentInvoiceObj, {
      storeName: settings.storeName,
      storeSubtitle: settings.storeSubtitle,
      storePhone: settings.storePhone,
      currency: settings.currency,
      thermalWidth: settings.thermalWidth,
    });

    if (ok) {
      showToast('تم فتح أمر الطباعة في تطبيق RawBT');
    } else {
      // If mobile intent didn't launch, open preview hub so user can download PNG image or print standalone
      setPreviewModalOpen(true);
      showToast('اختر الطريقة المناسبة من مركز الطباعة');
    }
  };

  // Clear current invoice items
  const handleClearCurrentInvoice = () => {
    if (items.length === 0) {
      showToast('الفاتورة فارغة بالفعل', 'info');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'مسح محتويات الفاتورة',
      message: 'هل تريد حذف جميع الأصناف المسجلة في هذه الفاتورة؟',
      onConfirm: () => {
        setItems([]);
        setEditingIndex(null);
        persistData([]);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('تم تفريغ أصناف الفاتورة');
      },
    });
  };

  // Copy text for messaging / WhatsApp
  const handleCopyText = () => {
    if (items.length === 0) {
      showToast('لا توجد أصناف لنسخها', 'error');
      return;
    }
    const msg = generateWhatsAppMessage(
      settings.storeName,
      invoiceNumber,
      customerName,
      dateStr,
      timeStr,
      items,
      grandTotal,
      settings.currency
    );
    navigator.clipboard
      .writeText(msg)
      .then(() => {
        showToast('تم نسخ نص الفاتورة للحافظة!');
      })
      .catch(() => {
        showToast('تعذر النسخ التلقائي، تم تجهيز النص');
      });
  };

  // Share invoice as IMAGE via WhatsApp (User requirement: مشاركة الفاتورة واتساب تكون صورة وليست نص)
  const handleShareWhatsApp = async (targetInv?: Invoice) => {
    const inv = targetInv || currentInvoiceObj;
    if (!inv || inv.items.length === 0) {
      showToast('لا توجد أصناف لمشاركتها', 'error');
      return;
    }
    if (!targetInv) recordCustomerName(customerName);
    showToast('جاري تجهيز صورة الفاتورة للمشاركة عبر واتساب...');

    try {
      const res = await shareInvoiceToWhatsAppAsImage(inv, {
        storeName: settings.storeName,
        storeSubtitle: settings.storeSubtitle,
        storePhone: settings.storePhone,
        currency: settings.currency,
        thermalWidth: settings.thermalWidth,
      });

      if (res.success) {
        sound.playSuccess();
        showToast(res.message);
      } else {
        showToast(res.message, 'info');
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('WhatsApp image share error:', err);
        showToast('تعذر إكمال مشاركة صورة الفاتورة', 'error');
      }
    }
  };

  // Export Invoice to PDF
  const handleExportPdf = async (targetInv?: Invoice) => {
    const inv = targetInv || currentInvoiceObj;
    if (!inv || inv.items.length === 0) {
      showToast('لا توجد أصناف لتصديرها', 'error');
      return;
    }
    if (!targetInv) recordCustomerName(customerName);
    showToast('جاري إنشاء ملف PDF...');
    const res = await exportInvoiceToPdf(inv, {
      storeName: settings.storeName,
      storeSubtitle: settings.storeSubtitle,
      storePhone: settings.storePhone,
      currency: settings.currency,
      thermalWidth: settings.thermalWidth,
    });
    if (res.success) sound.playSuccess();
    showToast(res.message);
  };

  // Export Invoice to Excel XLS
  const handleExportExcel = async (targetInv?: Invoice) => {
    const inv = targetInv || currentInvoiceObj;
    if (!inv || inv.items.length === 0) {
      showToast('لا توجد أصناف لتصديرها', 'error');
      return;
    }
    if (!targetInv) recordCustomerName(customerName);
    showToast('جاري تجهيز جدول إكسل...');
    const res = await exportInvoiceToExcel(inv, {
      storeName: settings.storeName,
      currency: settings.currency,
    });
    if (res.success) sound.playSuccess();
    showToast(res.message);
  };

  // Export Invoice to JPG Image
  const handleExportJpg = async (targetInv?: Invoice) => {
    const inv = targetInv || currentInvoiceObj;
    if (!inv || inv.items.length === 0) {
      showToast('لا توجد أصناف لتصديرها', 'error');
      return;
    }
    if (!targetInv) recordCustomerName(customerName);
    showToast('جاري حفظ صورة JPG عالية الدقة...');
    const res = await exportInvoiceToJpg(inv, {
      storeName: settings.storeName,
      storeSubtitle: settings.storeSubtitle,
      storePhone: settings.storePhone,
      currency: settings.currency,
      thermalWidth: settings.thermalWidth,
    });
    if (res.success) sound.playSuccess();
    showToast(res.message);
  };

  // Export Data Backup (JSON)
  const handleExportBackup = () => {
    recordCustomerName(customerName);
    const backupData = {
      app: settings.storeName,
      version: 7,
      date: new Date().toISOString(),
      history,
      suggestions,
      customers,
      customerAccounts,
      itemPrices,
      lastInvNum: invoiceNumber,
      settings,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `نسخة_بقالة_العزي_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير ملف النسخة الاحتياطية بنجاح!');
  };

  // Import Data Backup (JSON)
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const data = JSON.parse(raw);

        let nextHistory = history;
        let nextSuggestions = suggestions;
        let nextCustomers = customers;
        let nextPrices = itemPrices;
        let nextCustomerAccounts = customerAccounts;

        if (Array.isArray(data.history)) {
          nextHistory = data.history;
          setHistory(nextHistory);
        }
        if (Array.isArray(data.suggestions)) {
          nextSuggestions = Array.from(new Set([...suggestions, ...data.suggestions]));
          setSuggestions(nextSuggestions);
        }
        if (Array.isArray(data.customers)) {
          nextCustomers = Array.from(new Set([...customers, ...data.customers]));
          setCustomers(nextCustomers);
        }
        if (Array.isArray(data.customerAccounts)) {
          nextCustomerAccounts = data.customerAccounts;
          setCustomerAccounts(nextCustomerAccounts);
          localStorage.setItem('azizi_customer_accounts', JSON.stringify(nextCustomerAccounts));
        }
        if (data.itemPrices && typeof data.itemPrices === 'object') {
          nextPrices = { ...itemPrices, ...data.itemPrices };
          setItemPrices(nextPrices);
        }
        if (data.lastInvNum) {
          setInvoiceNumber(data.lastInvNum);
        }
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }

        persistData(nextHistory, nextSuggestions, nextCustomers, nextPrices, data.lastInvNum);
        showToast(
          `تم استعادة النسخة الاحتياطية! (${nextHistory.length} فاتورة، ${nextCustomerAccounts.length} عميل)`
        );
      } catch (err) {
        console.error('Import error:', err);
        showToast('فشل قراءة ملف النسخة الاحتياطية', 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  // Toggle Dark Mode
  const handleToggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('azizi_dark_mode', JSON.stringify(next));
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (isAppExited) {
    return (
      <div
        id="app-exited-screen"
        className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans antialiased"
        dir="rtl"
      >
        <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-xl p-0.5 bg-slate-800">
            <img
              src="/app-logo.jpg"
              alt={settings.storeName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">تم الخروج من التطبيق بنجاح</h2>
            <p className="text-xs text-emerald-400 font-semibold mt-0.5">
              {settings.storeName} - {settings.storeSubtitle}
            </p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
            تم حفظ كافة فواتيرك وسجلات حسابات العملاء بأمان في ذاكرة جهازك. يمكنك إغلاق التبويب الآن أو إعادة فتح التطبيق.
          </p>
          <button
            id="btn-reopen-app"
            onClick={() => {
              sound.playSuccess();
              setIsAppExited(false);
            }}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-md transition"
          >
            إعادة فتح تطبيق الكاشير
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      } flex flex-col justify-center items-center font-sans antialiased`}
      dir="rtl"
    >
      {/* App Main Viewport Container */}
      <div
        id="app-viewport-container"
        className="w-full max-w-xl min-h-screen bg-white dark:bg-slate-900 shadow-md flex flex-col mx-auto"
      >
        {/* Top App Bar (Actions, Navigation, Invoice # & Payment Pill) */}
        <div className="px-3 pt-2">
          <TopAppBar
            invoiceNumber={invoiceNumber}
            paymentType={paymentType}
            onPaymentTypeChange={setPaymentType}
            onPrint={handlePrint}
            onSave={handleSaveInvoice}
            onHistory={() => setActiveTab('history')}
            onCopy={handleCopyText}
            historyCount={history.length}
            itemsCount={items.length}
            onReset={handleResetInvoice}
            isDark={isDark}
            onToggleDark={handleToggleDark}
            onClearAll={handleClearCurrentInvoice}
            onOpenSettings={() => setActiveTab('settings')}
            onExitApp={() => setIsExitModalOpen(true)}
            onExportPdf={() => handleExportPdf()}
            onExportExcel={() => handleExportExcel()}
            onExportJpg={() => handleExportJpg()}
            onShareWhatsAppImage={() => handleShareWhatsApp()}
            storeName={settings.storeName}
            onOpenCustomers={() => setActiveTab('customers')}
            onOpenCatalog={() => setActiveTab('catalog')}
            debtorsCount={customerAccounts.filter((c) => c.balance > 0).length}
          />
        </div>

        {/* Main Screen Viewport Body based on Active Navigation Tab */}
        <main className="flex-1 p-3 space-y-3 overflow-y-auto">
          {activeTab === 'pos' && (
            <>
              {/* Quick Entry Card */}
              <QuickEntryCard
                customerName={customerName}
                onCustomerChange={setCustomerName}
                customersList={customers}
                suggestionsList={suggestions}
                itemPrices={itemPrices}
                editingItem={
                  editingIndex !== null && items[editingIndex]
                    ? {
                        index: editingIndex,
                        name: items[editingIndex].name,
                        qty: items[editingIndex].qty,
                        total: items[editingIndex].total,
                      }
                    : null
                }
                onAddItem={handleAddItem}
                onCancelEdit={() => setEditingIndex(null)}
                currency={settings.currency}
                isDark={isDark}
              />

              {/* Items List Table */}
              <InvoiceItemsList
                items={items}
                editingIndex={editingIndex}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                currency={settings.currency}
              />

              {/* Summary and Main POS Action Buttons */}
              <InvoiceSummaryFooter
                itemsCount={items.length}
                grandTotal={grandTotal}
                paymentType={paymentType}
                onPaymentTypeChange={setPaymentType}
                onSave={handleSaveInvoice}
                onPrint={handlePrint}
                onPrintBluetooth={handlePrintBluetooth}
                onOpenPreview={() => setPreviewModalOpen(true)}
                onShareWhatsApp={handleShareWhatsApp}
                onReset={handleResetInvoice}
                onExportPdf={() => handleExportPdf()}
                onExportExcel={() => handleExportExcel()}
                onExportJpg={() => handleExportJpg()}
                currency={settings.currency}
                isDark={isDark}
              />
            </>
          )}

          {activeTab === 'customers' && (
            <CustomersView
              customers={customerAccounts}
              onAddCustomer={handleAddCustomer}
              onAddPayment={handleAddCustomerPayment}
              onDeleteCustomer={handleDeleteCustomer}
              onSelectCustomerForInvoice={handleSelectCustomerForInvoice}
              currency={settings.currency}
              storeName={settings.storeName}
              onBack={() => setActiveTab('pos')}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              history={history}
              onRestore={handleRestoreInvoice}
              onDelete={handleDeleteHistoryInvoice}
              onClearAll={handleClearAllHistory}
              onPrintInvoice={(inv) => {
                handlePrint(inv);
              }}
              onShareInvoice={(inv) => {
                handleShareWhatsApp(inv);
              }}
              currency={settings.currency}
              isDark={isDark}
              storeName={settings.storeName}
              storeSubtitle={settings.storeSubtitle}
              storePhone={settings.storePhone}
              thermalWidth={settings.thermalWidth}
              onBack={() => setActiveTab('pos')}
            />
          )}

          {activeTab === 'catalog' && (
            <ItemCatalogView
              suggestions={suggestions}
              itemPrices={itemPrices}
              onAddItemToCatalog={(name, price) => {
                const nextSugg = [name, ...suggestions.filter((s) => s !== name)];
                const nextPrices = { ...itemPrices, [name]: price };
                setSuggestions(nextSugg);
                setItemPrices(nextPrices);
                persistData(undefined, nextSugg, undefined, nextPrices);
                showToast(`تمت إضافة ${name} للدليل`);
              }}
              onDeleteItemFromCatalog={(name) => {
                const nextSugg = suggestions.filter((s) => s !== name);
                const nextPrices = { ...itemPrices };
                delete nextPrices[name];
                setSuggestions(nextSugg);
                setItemPrices(nextPrices);
                persistData(undefined, nextSugg, undefined, nextPrices);
                showToast(`تم حذف ${name} من الدليل`, 'info');
              }}
              onDirectAddToInvoice={(name, price) => {
                handleAddItem(name, 1, price);
                setActiveTab('pos');
              }}
              currency={settings.currency}
              isDark={isDark}
              onBack={() => setActiveTab('pos')}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={(newSet) => {
                setSettings(newSet);
                localStorage.setItem('azizi_app_settings', JSON.stringify(newSet));
                showToast('تم حفظ الإعدادات');
              }}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              isDark={isDark}
              onBack={() => setActiveTab('pos')}
            />
          )}
        </main>
      </div>

      {/* Pure Text Thermal Receipt DOM for @media print (Physical Bluetooth/USB 80mm Printer) */}
      <ThermalPrintReceipt
        invoice={activePrintInvoice || currentInvoiceObj}
        storeName={settings.storeName}
        storeSubtitle={settings.storeSubtitle}
        storePhone={settings.storePhone}
        currency={settings.currency}
        width={settings.thermalWidth}
      />

      {/* Simulated Android Thermal Receipt Preview Modal */}
      <ThermalPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        invoice={currentInvoiceObj}
        storeName={settings.storeName}
        storeSubtitle={settings.storeSubtitle}
        storePhone={settings.storePhone}
        currency={settings.currency}
        thermalWidth={settings.thermalWidth}
        onPrint={() => {
          setPreviewModalOpen(false);
          handlePrint();
        }}
        onPrintBluetooth={() => {
          setPreviewModalOpen(false);
          handlePrintBluetooth();
        }}
        onShareWhatsApp={() => {
          setPreviewModalOpen(false);
          handleShareWhatsApp();
        }}
        onCopyText={() => {
          setPreviewModalOpen(false);
          handleCopyText();
        }}
      />

      {/* Exit Confirmation Modal */}
      <ExitConfirmModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        onConfirmExit={() => {
          sound.playTap();
          setIsExitModalOpen(false);
          setIsAppExited(true);
          try {
            CapApp.exitApp();
          } catch {}
          try {
            if ((navigator as any).app?.exitApp) {
              (navigator as any).app.exitApp();
            }
          } catch {}
          try {
            if ((window as any).Android?.closeApp) {
              (window as any).Android.closeApp();
            }
          } catch {}
          try {
            window.close();
          } catch {
            // In case browser blocks window.close
          }
        }}
        storeName={settings.storeName}
      />

      {/* Android Material 3 Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        isDangerous={confirmDialog.isDangerous}
      />

      {/* Android Toast Snackbar */}
      <AndroidToast message={toastMessage?.msg || null} type={toastMessage?.type} />
    </div>
  );
}

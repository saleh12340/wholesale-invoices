import React, { useState, useEffect, useRef } from 'react';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { AndroidNavBar } from './components/AndroidNavBar';
import { TopAppBar } from './components/TopAppBar';
import { QuickEntryCard } from './components/QuickEntryCard';
import { InvoiceItemsList } from './components/InvoiceItemsList';
import { InvoiceSummaryFooter } from './components/InvoiceSummaryFooter';
import { HistoryView } from './components/HistoryView';
import { ItemCatalogView } from './components/ItemCatalogView';
import { SettingsView } from './components/SettingsView';
import { ThermalPrintReceipt } from './components/ThermalPrintReceipt';
import { ThermalPreviewModal } from './components/ThermalPreviewModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AndroidToast } from './components/AndroidToast';

import { Invoice, InvoiceItem, AppSettings, ActiveTab } from './types';
import {
  INITIAL_SUGGESTIONS,
  INITIAL_PRICES,
  INITIAL_CUSTOMERS,
  generateWhatsAppMessage,
} from './utils/arabic';
import { sound } from './utils/audio';
import { printThermalReceiptViaIframe, printViaRawBT } from './utils/thermalPrinter';

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
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // UI Control States
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);

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

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Load from LocalStorage (Compatible with original HTML format)
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('azizi_invoice_history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));

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

  // Grand Total calculation
  const grandTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);

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
    const unitPrice = qty > 0 ? total / qty : 0;

    if (editingIndex !== null && editingIndex >= 0 && editingIndex < items.length) {
      const updated = [...items];
      updated[editingIndex] = {
        ...updated[editingIndex],
        name,
        qty,
        total,
        unitPrice,
      };
      setItems(updated);
      setEditingIndex(null);
      showToast(`تم تحديث الصنف: ${name}`);
    } else {
      const newItem: InvoiceItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name,
        qty,
        total,
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
      const nextPrices = { ...itemPrices, [cleanName]: unitPrice > 0 ? unitPrice : total };
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
    sound.playSuccess();
  };

  // Restore invoice from history to active editor
  const handleRestoreInvoice = (inv: Invoice) => {
    setItems([...inv.items]);
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

  // Reliable thermal print via isolated iframe (bypasses Android spooler 2-page split & DOM issues)
  const handlePrint = async () => {
    if (items.length === 0) {
      showToast('لا توجد أصناف لطباعتها', 'error');
      return;
    }
    recordCustomerName(customerName);
    showToast('جاري إرسال الفاتورة للطباعة الحرارية...');
    await printThermalReceiptViaIframe(currentInvoiceObj, {
      storeName: settings.storeName,
      storeSubtitle: settings.storeSubtitle,
      storePhone: settings.storePhone,
      currency: settings.currency,
      thermalWidth: settings.thermalWidth,
    });
  };

  // Direct Bluetooth ESC/POS Print via RawBT app
  const handlePrintBluetooth = () => {
    if (items.length === 0) {
      showToast('لا توجد أصناف لطباعتها', 'error');
      return;
    }
    recordCustomerName(customerName);
    const ok = printViaRawBT(currentInvoiceObj, {
      storeName: settings.storeName,
      storeSubtitle: settings.storeSubtitle,
      storePhone: settings.storePhone,
      currency: settings.currency,
      thermalWidth: settings.thermalWidth,
    });
    if (ok) {
      showToast('تم إرسال الفاتورة لطابعة البلوتوث (RawBT)');
    } else {
      showToast('تعذر الفتح التلقائي لطابعة البلوتوث');
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

  // Share directly via WhatsApp link
  const handleShareWhatsApp = () => {
    if (items.length === 0) {
      showToast('لا توجد أصناف لمشاركتها', 'error');
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
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
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
          `تم استعادة النسخة الاحتياطية! (${nextHistory.length} فاتورة، ${nextSuggestions.length} صنف)`
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

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      } flex flex-col justify-center items-center font-sans antialiased`}
      dir="rtl"
    >
      {/* Container: If isPhoneFrame is true, wrap in realistic Android phone frame with punch hole & borders */}
      <div
        id="app-viewport-container"
        className={`w-full transition-all duration-300 ${
          isPhoneFrame
            ? 'max-w-md my-4 sm:my-8 rounded-[40px] shadow-2xl border-[10px] border-slate-800 bg-white dark:bg-slate-900 overflow-hidden ring-1 ring-slate-700/50'
            : 'max-w-xl min-h-screen bg-white dark:bg-slate-900 shadow-sm flex flex-col'
        }`}
      >
        {/* 1. Android System Status Bar (Clock, Punch hole camera, 5G, Battery) */}
        <AndroidStatusBar isDark={isDark} />

        {/* 2. Top App Bar matching Screenshot 1 (Actions, Tools, Invoice # & Payment Pill) */}
        <div className="px-3 pt-1">
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
          />
        </div>

        {/* 3. Main Screen Viewport Body based on Active Navigation Tab */}
        <main className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-145px)]">
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
                currency={settings.currency}
                isDark={isDark}
              />
            </>
          )}

          {activeTab === 'history' && (
            <HistoryView
              history={history}
              onRestore={handleRestoreInvoice}
              onDelete={handleDeleteHistoryInvoice}
              onClearAll={handleClearAllHistory}
              onPrintInvoice={async (inv) => {
                showToast('جاري طباعة الفاتورة...');
                await printThermalReceiptViaIframe(inv, {
                  storeName: settings.storeName,
                  storeSubtitle: settings.storeSubtitle,
                  storePhone: settings.storePhone,
                  currency: settings.currency,
                  thermalWidth: settings.thermalWidth,
                });
              }}
              onShareInvoice={(inv) => {
                const msg = generateWhatsAppMessage(
                  settings.storeName,
                  inv.number,
                  inv.customer,
                  inv.date,
                  inv.time,
                  inv.items,
                  inv.total,
                  settings.currency
                );
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              currency={settings.currency}
              isDark={isDark}
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
            />
          )}
        </main>

        {/* 4. Android Bottom Navigation Bar (Tabs + Gesture Pill) */}
        <AndroidNavBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          historyCount={history.length}
          itemsCount={items.length}
          isDark={isDark}
        />
      </div>

      {/* Pure Text Thermal Receipt DOM for @media print (Physical Bluetooth/USB 80mm Printer) */}
      <ThermalPrintReceipt
        invoice={currentInvoiceObj}
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

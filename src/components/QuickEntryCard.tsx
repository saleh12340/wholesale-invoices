import React, { useState, useEffect, useRef } from 'react';
import { Zap, User, Plus, Check } from 'lucide-react';
import { sound } from '../utils/audio';

interface QuickEntryCardProps {
  customerName: string;
  onCustomerChange: (name: string) => void;
  customersList: string[];
  suggestionsList: string[];
  itemPrices: Record<string, number>;
  editingItem: { index: number; name: string; qty: number; total: number } | null;
  onAddItem: (name: string, qty: number, total: number) => void;
  onCancelEdit: () => void;
  currency?: string;
  isDark?: boolean;
}

export const QuickEntryCard: React.FC<QuickEntryCardProps> = ({
  customerName,
  onCustomerChange,
  customersList,
  suggestionsList,
  itemPrices,
  editingItem,
  onAddItem,
  onCancelEdit,
  currency = 'ر.ي',
}) => {
  const [itemName, setItemName] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  const itemInputRef = useRef<HTMLInputElement>(null);
  const totalInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const customerContainerRef = useRef<HTMLDivElement>(null);
  const itemContainerRef = useRef<HTMLDivElement>(null);

  // Sync editing item state
  useEffect(() => {
    if (editingItem) {
      setItemName(editingItem.name);
      setTotalPrice(editingItem.total.toString());
      setQuantity(editingItem.qty.toString());
      itemInputRef.current?.focus();
    }
  }, [editingItem]);

  // Dismiss suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        customerContainerRef.current &&
        !customerContainerRef.current.contains(e.target as Node)
      ) {
        setShowCustomerSuggestions(false);
      }
      if (
        itemContainerRef.current &&
        !itemContainerRef.current.contains(e.target as Node)
      ) {
        setShowItemSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter customer suggestions
  const matchedCustomers = customersList
    .filter(
      (c) =>
        c.toLowerCase().includes(customerName.toLowerCase()) &&
        c.trim() !== customerName.trim()
    )
    .slice(0, 5);

  // Filter item suggestions
  const matchedItems = suggestionsList
    .filter(
      (s) =>
        s.toLowerCase().includes(itemName.toLowerCase()) &&
        s.trim() !== itemName.trim()
    )
    .slice(0, 8);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedName = itemName.trim();
    const parsedTotal = parseFloat(totalPrice);
    const parsedQty = parseFloat(quantity) || 1;

    if (!trimmedName) {
      sound.playError();
      itemInputRef.current?.focus();
      return;
    }

    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      sound.playError();
      totalInputRef.current?.focus();
      return;
    }

    onAddItem(trimmedName, parsedQty, parsedTotal);

    // Reset inputs
    setItemName('');
    setTotalPrice('');
    setQuantity('1');
    setShowItemSuggestions(false);

    // Re-focus on item name for super-fast cashier entry
    itemInputRef.current?.focus();
  };

  const selectSuggestion = (name: string) => {
    setItemName(name);
    sound.playTap();
    const price = itemPrices[name];
    if (price && (!totalPrice || totalPrice === '0')) {
      const q = parseFloat(quantity) || 1;
      setTotalPrice((price * q).toString());
    }
    setShowItemSuggestions(false);
    totalInputRef.current?.focus();
    totalInputRef.current?.select();
  };

  return (
    <div className="space-y-2.5">
      {/* 1. Customer Name Card matching screenshot */}
      <div className="relative" ref={customerContainerRef}>
        <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 shadow-xs transition">
          <input
            id="customer-input"
            type="text"
            value={customerName}
            onChange={(e) => {
              onCustomerChange(e.target.value);
              setShowCustomerSuggestions(true);
            }}
            onFocus={() => setShowCustomerSuggestions(true)}
            placeholder="اسم العميل (مثال: صالح العزي)..."
            autoComplete="off"
            className="w-full text-right text-sm font-semibold text-slate-800 dark:text-slate-100 bg-transparent outline-none"
          />
          <div className="text-slate-400 pl-1 shrink-0">
            <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
        </div>

        {/* Customer Suggestions Dropdown */}
        {showCustomerSuggestions && matchedCustomers.length > 0 && (
          <div className="absolute top-full right-0 left-0 mt-1 bg-white dark:bg-slate-800 border border-emerald-500/30 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
            {matchedCustomers.map((cust) => (
              <button
                key={cust}
                type="button"
                onClick={() => {
                  sound.playTap();
                  onCustomerChange(cust);
                  setShowCustomerSuggestions(false);
                }}
                className="w-full text-right px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 flex items-center justify-between transition"
              >
                <span>{cust}</span>
                <span className="text-[10px] text-slate-400 font-normal">عميل مسجل</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Fast Entry Card matching Screenshot 1 */}
      <div
        id="quick-entry-card"
        className="rounded-2xl p-3 border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs space-y-2.5"
      >
        {/* Header: إدخال سريع للأصناف: ⚡ and إكمال تلقائي ذكي */}
        <div className="flex items-center justify-between text-xs select-none">
          <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-100">
            <span className="text-amber-500">⚡</span>
            <span>إدخال سريع للأصناف:</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600 px-2 py-0.5 rounded-full bg-white/60 dark:bg-slate-800/60">
            إكمال تلقائي ذكي
          </div>
        </div>

        {/* 3 Inputs Grid: [الإجمالي (ر.ي)*]  [الكمية*]  [اسم الصنف] */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="grid grid-cols-12 gap-2">
            {/* Column 1 (Right): Total Price */}
            <div className="col-span-4">
              <label
                htmlFor="quick-total-input"
                className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 text-center"
              >
                الإجمالي ({currency})*
              </label>
              <input
                id="quick-total-input"
                ref={totalInputRef}
                type="number"
                inputMode="decimal"
                step="any"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className="w-full px-2 py-2 text-center text-sm font-black font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
              />
            </div>

            {/* Column 2 (Middle): Quantity */}
            <div className="col-span-3">
              <label
                htmlFor="quick-qty-input"
                className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 text-center"
              >
                الكمية*
              </label>
              <input
                id="quick-qty-input"
                ref={qtyInputRef}
                type="number"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-full px-2 py-2 text-center text-sm font-black font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
              />
            </div>

            {/* Column 3 (Left): Item Name with autocomplete */}
            <div className="col-span-5 relative" ref={itemContainerRef}>
              <label
                htmlFor="quick-name-input"
                className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 text-right"
              >
                اسم الصنف
              </label>
              <input
                id="quick-name-input"
                ref={itemInputRef}
                type="text"
                value={itemName}
                onChange={(e) => {
                  setItemName(e.target.value);
                  setShowItemSuggestions(true);
                }}
                onFocus={() => setShowItemSuggestions(true)}
                placeholder="ابحث أو اكتب اسم الصنف"
                autoComplete="off"
                className="w-full px-2.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs text-right"
              />

              {/* Suggestions Dropdown */}
              {showItemSuggestions && matchedItems.length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-1 bg-white dark:bg-slate-800 border border-emerald-500/40 rounded-xl shadow-2xl z-40 max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                  {matchedItems.map((itemText) => {
                    const price = itemPrices[itemText];
                    return (
                      <button
                        key={itemText}
                        type="button"
                        onClick={() => selectSuggestion(itemText)}
                        className="w-full text-right px-3 py-2 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-900/40 flex items-center justify-between transition group"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600">
                          {itemText}
                        </span>
                        {price ? (
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                            {price} {currency}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Full Width Button: + إضافة للصنف */}
          <button
            id="btn-add-item-submit"
            type="submit"
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs active:scale-[0.98] transition flex items-center justify-center gap-1.5"
          >
            {editingItem ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
            <span>{editingItem ? 'تحديث الصنف' : 'إضافة للصنف'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

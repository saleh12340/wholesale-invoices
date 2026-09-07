import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, UserCheck, Sparkles, Minus, Zap, Search } from 'lucide-react';
import { getSmartMatches } from '../utils/arabic';
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
  isDark = false,
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

  // Sync when entering editing mode
  useEffect(() => {
    if (editingItem) {
      setItemName(editingItem.name || '');
      setQuantity(editingItem.qty.toString() || '1');
      setTotalPrice(editingItem.total.toString() || '');
      totalInputRef.current?.focus();
      totalInputRef.current?.select();
    }
  }, [editingItem]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        itemContainerRef.current &&
        !itemContainerRef.current.contains(e.target as Node)
      ) {
        setShowItemSuggestions(false);
      }
      if (
        customerContainerRef.current &&
        !customerContainerRef.current.contains(e.target as Node)
      ) {
        setShowCustomerSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const matchedItems = getSmartMatches(suggestionsList, itemName).slice(0, 15);
  const matchedCustomers = getSmartMatches(customersList, customerName).slice(0, 8);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const tot = parseFloat(totalPrice) || 0;
    const qty = parseFloat(quantity) || 1;
    const name = itemName.trim() || 'صنف بدون اسم';

    if (tot <= 0 && !itemName) {
      totalInputRef.current?.focus();
      return;
    }

    sound.playBeep();
    onAddItem(name, qty, tot);

    // Reset input fields
    setItemName('');
    setTotalPrice('');
    setQuantity('1');
    setShowItemSuggestions(false);

    totalInputRef.current?.focus();
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

  const handleQtyChange = (delta: number) => {
    sound.playTap();
    const current = parseFloat(quantity) || 1;
    const next = Math.max(1, current + delta);
    setQuantity(next.toString());

    // If unit price exists, recalculate total
    if (itemName && itemPrices[itemName]) {
      setTotalPrice((itemPrices[itemName] * next).toString());
    }
  };

  // Popular quick chips (first 6 items)
  const quickChips = suggestionsList.slice(0, 6);

  return (
    <div
      id="quick-entry-card"
      className="bg-white dark:bg-slate-800/90 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5 transition-colors"
    >
      {/* Customer Name Selector */}
      <div className="relative" ref={customerContainerRef}>
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
          <label htmlFor="customer-input" className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            اسم العميل أو المحل:
          </label>
          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md">
            {customerName && customerName !== 'عميل نقدي' ? 'عميل مسجل' : 'نقدي افتراضي'}
          </span>
        </div>

        <div className="relative">
          <input
            id="customer-input"
            type="text"
            value={customerName}
            onChange={(e) => {
              onCustomerChange(e.target.value);
              setShowCustomerSuggestions(true);
            }}
            onFocus={() => setShowCustomerSuggestions(true)}
            placeholder="اكتب اسم العميل (مثال: عميل نقدي، مطعم الفخامة)..."
            autoComplete="off"
            className="w-full pl-3 pr-8 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
          />
          <div className="absolute right-2.5 top-2.5 text-slate-400">
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
                <span className="text-[10px] text-slate-400 font-normal">عميل معتمد</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Entry Box */}
      <div
        className={`p-3 rounded-xl border transition-colors ${
          editingItem
            ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/50'
            : 'bg-emerald-50/50 dark:bg-slate-700/40 border-emerald-200/80 dark:border-emerald-800/30'
        }`}
      >
        <div className="flex justify-between items-center text-xs font-bold mb-2">
          <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{editingItem ? 'تعديل الصنف المحدد' : 'إدخال سريع للصنف'}</span>
          </div>
          {editingItem && (
            <button
              onClick={() => {
                sound.playTap();
                onCancelEdit();
                setItemName('');
                setTotalPrice('');
                setQuantity('1');
              }}
              className="text-[11px] text-amber-700 dark:text-amber-300 underline font-semibold"
            >
              إلغاء التعديل
            </button>
          )}
        </div>

        {/* Inputs Grid */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="grid grid-cols-12 gap-2">
            {/* 1. Total Price Input */}
            <div className="col-span-4">
              <label
                htmlFor="quick-total-input"
                className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1"
              >
                المبلغ ({currency}) *
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
                className="w-full px-2 py-2 text-center text-sm font-black font-mono text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
              />
            </div>

            {/* 2. Quantity Stepper */}
            <div className="col-span-3">
              <label
                htmlFor="quick-qty-input"
                className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 text-center"
              >
                الكمية *
              </label>
              <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => handleQtyChange(1)}
                  className="px-1.5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold active:scale-95"
                >
                  +
                </button>
                <input
                  id="quick-qty-input"
                  ref={qtyInputRef}
                  type="number"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full text-center text-xs font-bold text-slate-800 dark:text-slate-100 outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => handleQtyChange(-1)}
                  className="px-1.5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold active:scale-95"
                >
                  -
                </button>
              </div>
            </div>

            {/* 3. Item Name with suggestions */}
            <div className="col-span-5 relative" ref={itemContainerRef}>
              <label
                htmlFor="quick-name-input"
                className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1"
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
                placeholder="ابحث أو اكتب الصنف..."
                autoComplete="off"
                className="w-full px-2.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
              />

              {/* Suggestions Popup */}
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

          {/* Quick Item Chips for rapid touch POS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
            <span className="text-[10px] text-slate-400 shrink-0 font-medium">سريع:</span>
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => selectSuggestion(chip)}
                className="text-[10px] px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 whitespace-nowrap transition active:scale-95 shadow-2xs font-medium"
              >
                {chip.split(' ')[0]} {chip.split(' ')[1] || ''}
              </button>
            ))}
          </div>

          {/* Submit Button */}
          <button
            id="btn-add-item"
            type="submit"
            className={`w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md active:scale-98 transition flex items-center justify-center gap-1.5 ${
              editingItem
                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
            }`}
          >
            {editingItem ? (
              <>
                <Check className="w-4 h-4" />
                <span>تحديث الصنف المختار</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>إضافة الصنف للفاتورة</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

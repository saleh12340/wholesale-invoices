import React from 'react';
import { Trash2, ShoppingBag } from 'lucide-react';
import { InvoiceItem } from '../types';
import { formatNumber, formatUnitPrice, parseArabicNumber } from '../utils/arabic';
import { sound } from '../utils/audio';

interface InvoiceItemsListProps {
  items: InvoiceItem[];
  editingIndex: number | null;
  onEditItem: (index: number) => void;
  onDeleteItem: (index: number) => void;
  currency?: string;
}

export const InvoiceItemsList: React.FC<InvoiceItemsListProps> = ({
  items,
  editingIndex,
  onEditItem,
  onDeleteItem,
  currency = 'ر.ي',
}) => {
  if (items.length === 0) {
    return (
      <div
        id="empty-invoice-state"
        className="bg-white dark:bg-slate-800/90 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center select-none"
      >
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
          الفاتورة فارغة حالياً
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
          أدخل اسم الصنف والكمية والإجمالي، ثم اضغط على زر "إضافة للصنف"
        </p>
      </div>
    );
  }

  return (
    <div
      id="invoice-items-table-container"
      className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
    >
      {/* Table Header matching screenshot exactly: السعر | الكمية اسم الصنف | الإجمالي */}
      <div className="bg-slate-100/90 dark:bg-slate-700/60 px-3 py-2 border-b border-slate-200 dark:border-slate-600 text-[12px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between select-none">
        <div className="w-1/4 text-right">الإجمالي</div>
        <div className="w-1/2 text-center flex items-center justify-center gap-3">
          <span>الكمية</span>
          <span>اسم الصنف</span>
        </div>
        <div className="w-1/4 text-left">السعر</div>
      </div>

      {/* Items Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[420px] overflow-y-auto">
        {items.map((item, index) => {
          const isEditing = editingIndex === index;
          const qty = parseArabicNumber(item.qty) || 1;
          const total = parseArabicNumber(item.total);
          const rawUnitPrice = qty > 0 ? total / qty : 0;
          const unitPriceStr = formatUnitPrice(rawUnitPrice);

          return (
            <div
              key={item.id || index}
              id={`item-row-${index}`}
              className={`px-3 py-2.5 flex items-center justify-between transition group ${
                isEditing
                  ? 'bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-400'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
              }`}
            >
              {/* Right: Total Price (e.g. 26500 in bold green) */}
              <div className="w-1/4 text-right">
                <span className="font-mono font-bold text-sm sm:text-base text-emerald-700 dark:text-emerald-400">
                  {formatNumber(total)}
                </span>
              </div>

              {/* Middle: Qty and Item Name (e.g. 1      بسمتي 10 ك السحاب) */}
              <div
                onClick={() => {
                  sound.playTap();
                  onEditItem(index);
                }}
                className="w-1/2 flex items-center justify-center gap-3 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                title="اضغط للتعديل"
              >
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                  {qty}
                </span>
                <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate max-w-[150px] sm:max-w-[200px]">
                  {item.name}
                </span>
              </div>

              {/* Left: Unit Price + Red Trash Icon */}
              <div className="w-1/4 flex items-center justify-start gap-2">
                <button
                  id={`btn-delete-item-${index}`}
                  onClick={() => {
                    sound.playTap();
                    onDeleteItem(index);
                  }}
                  title="حذف الصنف"
                  className="p-1 text-red-500 hover:text-red-700 active:scale-95 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                  {unitPriceStr}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { Trash2, Edit3, ShoppingBag } from 'lucide-react';
import { InvoiceItem } from '../types';
import { formatNumber } from '../utils/arabic';
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
          أدخل المبلغ واسم الصنف في البطاقة أعلاه، ثم اضغط على زر الإضافة للبدء في تجهيز الفاتورة.
        </p>
      </div>
    );
  }

  return (
    <div
      id="invoice-items-table-container"
      className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
    >
      {/* Table Header */}
      <div className="bg-slate-100/80 dark:bg-slate-700/60 px-3 py-2 border-b border-slate-200 dark:border-slate-600 text-[11px] font-bold text-slate-600 dark:text-slate-300 grid grid-cols-12 gap-1 items-center select-none">
        <div className="col-span-3 text-right">الإجمالي</div>
        <div className="col-span-2 text-center">الكمية</div>
        <div className="col-span-5 text-right pr-1">الصنف</div>
        <div className="col-span-2 text-left">السعر الفردي</div>
      </div>

      {/* Items Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[380px] overflow-y-auto">
        {items.map((item, index) => {
          const isEditing = editingIndex === index;
          const unitPrice = item.qty > 0 ? item.total / item.qty : 0;

          return (
            <div
              key={item.id || index}
              id={`item-row-${index}`}
              className={`px-3 py-2.5 grid grid-cols-12 gap-1 items-center transition group ${
                isEditing
                  ? 'bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-400'
                  : index % 2 === 0
                  ? 'bg-white dark:bg-slate-800'
                  : 'bg-slate-50/50 dark:bg-slate-800/50'
              }`}
            >
              {/* Total Price */}
              <div className="col-span-3 text-right font-mono font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 truncate">
                {formatNumber(item.total)}
                <span className="text-[10px] font-normal font-sans mr-0.5 text-slate-400">
                  {currency}
                </span>
              </div>

              {/* Quantity */}
              <div className="col-span-2 text-center">
                <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold font-mono">
                  {item.qty}
                </span>
              </div>

              {/* Item Name (clickable to edit) */}
              <div
                onClick={() => {
                  sound.playTap();
                  onEditItem(index);
                }}
                className="col-span-5 text-right pr-1 font-semibold text-xs text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1"
                title="اضغط للتعديل"
              >
                <span className="text-[10px] text-slate-400 font-mono w-3.5 shrink-0">
                  {index + 1}.
                </span>
                <span className="truncate">{item.name}</span>
              </div>

              {/* Unit Price + Actions */}
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">
                  {unitPrice > 0 ? unitPrice.toFixed(1) : '0'}
                </span>

                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                  <button
                    onClick={() => {
                      sound.playTap();
                      onEditItem(index);
                    }}
                    title="تعديل"
                    className="p-1 text-slate-400 hover:text-amber-600 rounded"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      sound.playTap();
                      onDeleteItem(index);
                    }}
                    title="حذف"
                    className="p-1 text-slate-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

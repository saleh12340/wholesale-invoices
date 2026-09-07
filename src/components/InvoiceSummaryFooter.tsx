import React from 'react';
import { Printer, Bluetooth, Eye } from 'lucide-react';
import { formatNumber, parseArabicNumber } from '../utils/arabic';
import { sound } from '../utils/audio';

interface InvoiceSummaryFooterProps {
  itemsCount: number;
  grandTotal: number;
  paymentType: 'cash' | 'credit';
  onPaymentTypeChange: (type: 'cash' | 'credit') => void;
  onSave: () => void;
  onPrint: () => void;
  onPrintBluetooth?: () => void;
  onOpenPreview?: () => void;
  onShareWhatsApp: () => void;
  onReset: () => void;
  currency?: string;
  isDark?: boolean;
}

export const InvoiceSummaryFooter: React.FC<InvoiceSummaryFooterProps> = ({
  itemsCount,
  grandTotal,
  onPrint,
  onPrintBluetooth,
  onOpenPreview,
  currency = 'ر.ي',
}) => {
  const safeTotal = parseArabicNumber(grandTotal);

  return (
    <div
      id="invoice-summary-footer"
      className="no-print bg-white dark:bg-slate-800/95 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5 select-none"
    >
      {/* Total Display */}
      <div className="flex items-center justify-between px-1 gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 shrink-0">
          <span>عدد الأصناف:</span>
          <span className="font-mono font-bold text-sm bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg text-slate-800 dark:text-slate-100">
            {itemsCount}
          </span>
        </div>

        <div className="text-right max-w-[70%] overflow-hidden">
          <div className="text-xs text-slate-500 dark:text-slate-400">الإجمالي الكلي:</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400 truncate">
            {formatNumber(safeTotal)}{' '}
            <span className="text-xs font-normal font-sans text-slate-500 dark:text-slate-400">
              {currency}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
        {/* Print Thermal */}
        <button
          id="btn-footer-thermal-print"
          onClick={() => {
            sound.playTap();
            onPrint();
          }}
          disabled={itemsCount === 0}
          className="py-2.5 px-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition flex items-center justify-center gap-1"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>طباعة فورية</span>
        </button>

        {/* Bluetooth RawBT / Web Bluetooth */}
        <button
          id="btn-footer-bluetooth-print"
          onClick={() => {
            sound.playTap();
            if (onPrintBluetooth) onPrintBluetooth();
          }}
          disabled={itemsCount === 0}
          className="py-2.5 px-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition flex items-center justify-center gap-1"
        >
          <Bluetooth className="w-3.5 h-3.5" />
          <span>طابعة بلوتوث</span>
        </button>

        {/* Preview / Thermal Hub */}
        <button
          id="btn-footer-share-whatsapp"
          onClick={() => {
            sound.playTap();
            if (onOpenPreview) onOpenPreview();
          }}
          disabled={itemsCount === 0}
          className="py-2.5 px-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl shadow-xs active:scale-95 transition flex items-center justify-center gap-1"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>معاينة الفاتورة</span>
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { Save, Printer, Share2, RotateCcw, Wallet } from 'lucide-react';
import { formatNumber } from '../utils/arabic';
import { sound } from '../utils/audio';

interface InvoiceSummaryFooterProps {
  itemsCount: number;
  grandTotal: number;
  paymentType: 'cash' | 'credit';
  onPaymentTypeChange: (type: 'cash' | 'credit') => void;
  onSave: () => void;
  onPrint: () => void;
  onShareWhatsApp: () => void;
  onReset: () => void;
  currency?: string;
  isDark?: boolean;
}

export const InvoiceSummaryFooter: React.FC<InvoiceSummaryFooterProps> = ({
  itemsCount,
  grandTotal,
  paymentType,
  onPaymentTypeChange,
  onSave,
  onPrint,
  onShareWhatsApp,
  onReset,
  currency = 'ر.ي',
  isDark = false,
}) => {
  return (
    <div
      id="invoice-summary-footer"
      className="bg-white dark:bg-slate-800/95 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-md space-y-3 select-none"
    >
      {/* Metrics Row: Count & Total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>عدد الأصناف:</span>
          <span
            id="summary-count-badge"
            className="font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded-lg text-sm"
          >
            {itemsCount}
          </span>
        </div>

        {/* Cash / Credit (نقدي / آجل) Payment Switch */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-700/80 p-0.5 rounded-xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onPaymentTypeChange('cash');
            }}
            className={`px-2.5 py-1 rounded-lg transition ${
              paymentType === 'cash'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            نقدي
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onPaymentTypeChange('credit');
            }}
            className={`px-2.5 py-1 rounded-lg transition ${
              paymentType === 'credit'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            آجل
          </button>
        </div>
      </div>

      {/* Grand Total Display Highlight Box */}
      <div className="bg-gradient-to-l from-emerald-600 to-emerald-700 dark:from-emerald-800 dark:to-emerald-950 text-white p-3 rounded-xl shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-emerald-200" />
          </div>
          <div>
            <div className="text-[10px] text-emerald-100 uppercase tracking-wide">المبلغ المطلوب</div>
            <div className="text-xs font-bold text-emerald-200">
              {paymentType === 'cash' ? 'دفع نقدي فوري' : 'حساب ذمة آجل'}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight">
            {formatNumber(grandTotal)}
          </div>
          <div className="text-[11px] text-emerald-200 font-bold">{currency}</div>
        </div>
      </div>

      {/* Main Action Buttons Grid */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {/* Save Invoice */}
        <button
          id="btn-save-invoice"
          onClick={() => {
            sound.playTap();
            onSave();
          }}
          disabled={itemsCount === 0}
          className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          <span>حفظ الفاتورة</span>
        </button>

        {/* Thermal Print */}
        <button
          id="btn-thermal-print"
          onClick={() => {
            sound.playTap();
            onPrint();
          }}
          disabled={itemsCount === 0}
          className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة حرارية</span>
        </button>

        {/* Share WhatsApp */}
        <button
          id="btn-share-whatsapp"
          onClick={() => {
            sound.playTap();
            onShareWhatsApp();
          }}
          disabled={itemsCount === 0}
          className="py-2.5 px-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5"
        >
          <Share2 className="w-4 h-4" />
          <span>واتساب</span>
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import {
  Printer,
  Save,
  History,
  Copy,
  RotateCcw,
  Moon,
  Sun,
  LogOut,
  Download,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface TopAppBarProps {
  invoiceNumber: number;
  paymentType: 'cash' | 'credit';
  onPaymentTypeChange: (type: 'cash' | 'credit') => void;
  onPrint: () => void;
  onSave: () => void;
  onHistory: () => void;
  onCopy: () => void;
  historyCount: number;
  itemsCount: number;
  onReset: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  onClearAll: () => void;
  onOpenSettings: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  invoiceNumber,
  paymentType,
  onPaymentTypeChange,
  onPrint,
  onSave,
  onHistory,
  onCopy,
  historyCount,
  itemsCount,
  onReset,
  isDark,
  onToggleDark,
  onClearAll,
  onOpenSettings,
}) => {
  return (
    <header className="no-print space-y-2.5 pt-2 pb-1 select-none">
      {/* 1. Main Action Buttons Row matching Screenshot 1 */}
      <div className="grid grid-cols-4 gap-2">
        {/* Print Button (Solid Green) */}
        <button
          id="btn-top-print"
          onClick={() => {
            sound.playTap();
            onPrint();
          }}
          className="py-2 px-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة</span>
        </button>

        {/* Save Button (White with Green Border) */}
        <button
          id="btn-top-save"
          onClick={() => {
            sound.playTap();
            onSave();
          }}
          disabled={itemsCount === 0}
          className="py-2 px-1 bg-white dark:bg-slate-800 border border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 active:scale-95 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>حفظ</span>
        </button>

        {/* History Button (White with Blue Border & Count Badge) */}
        <button
          id="btn-top-history"
          onClick={() => {
            sound.playTap();
            onHistory();
          }}
          className="py-2 px-1 bg-white dark:bg-slate-800 border border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 active:scale-95 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
        >
          <History className="w-4 h-4" />
          <span>السجل</span>
          {historyCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
              {historyCount}
            </span>
          )}
        </button>

        {/* Copy Button (White with Amber Border) */}
        <button
          id="btn-top-copy"
          onClick={() => {
            sound.playTap();
            onCopy();
          }}
          disabled={itemsCount === 0}
          className="py-2 px-1 bg-white dark:bg-slate-800 border border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 active:scale-95 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Copy className="w-4 h-4" />
          <span>نسخ</span>
        </button>
      </div>

      {/* 2. Sub-Toolbar Icons Row matching Screenshot 1 */}
      <div className="flex items-center justify-start gap-4 px-1 text-slate-600 dark:text-slate-300">
        {/* Reset / New Invoice (Red Circular Arrow) */}
        <button
          id="btn-top-reset"
          onClick={() => {
            sound.playTap();
            onReset();
          }}
          title="فاتورة جديدة / إعادة تعيين"
          className="p-1.5 text-red-500 hover:text-red-700 active:scale-90 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Dark Mode Toggle */}
        <button
          id="btn-top-dark-toggle"
          onClick={() => {
            sound.playTap();
            onToggleDark();
          }}
          title="تغيير المظهر (ليلي / نهاري)"
          className="p-1.5 text-slate-700 dark:text-amber-300 hover:text-slate-900 active:scale-90 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Logout / Clear */}
        <button
          id="btn-top-clear-all"
          onClick={() => {
            sound.playTap();
            onClearAll();
          }}
          title="مسح وتفريغ"
          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 active:scale-90 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <LogOut className="w-4 h-4" />
        </button>

        {/* Backup / Settings */}
        <button
          id="btn-top-backup"
          onClick={() => {
            sound.playTap();
            onOpenSettings();
          }}
          title="النسخ الاحتياطي والإعدادات"
          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 active:scale-90 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Invoice Number & Cash/Credit Pill matching Screenshot 1 */}
      <div className="flex items-center justify-between px-1">
        {/* Cash / Credit Toggle Pill */}
        <button
          id="btn-payment-type-pill"
          type="button"
          onClick={() => {
            sound.playTap();
            onPaymentTypeChange(paymentType === 'cash' ? 'credit' : 'cash');
          }}
          className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
            paymentType === 'cash'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700'
          }`}
        >
          <span>{paymentType === 'cash' ? 'نقدي / آجل' : 'آجل (ذمة)'}</span>
        </button>

        {/* Invoice Number */}
        <div className="text-right">
          <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400">
            رقم الفاتورة: #{invoiceNumber}
          </span>
        </div>
      </div>
    </header>
  );
};

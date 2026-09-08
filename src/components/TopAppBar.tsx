import React from 'react';
import {
  Printer,
  Save,
  History,
  Copy,
  BarChart3,
  RotateCcw,
  Moon,
  Sun,
  LogOut,
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Users,
  Boxes,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface TopAppBarProps {
  invoiceNumber: number;
  paymentType: 'cash' | 'credit';
  onPaymentTypeChange: (type: 'cash' | 'credit') => void;
  onPrint: () => void;
  onSave: () => void;
  onHistory: () => void;
  onOpenReports: () => void;
  onCopy?: () => void;
  historyCount: number;
  itemsCount: number;
  onReset: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  onClearAll: () => void;
  onOpenSettings: () => void;
  onExitApp: () => void;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  onExportJpg?: () => void;
  onShareWhatsAppImage?: () => void;
  storeName?: string;
  onOpenCustomers?: () => void;
  onOpenCatalog?: () => void;
  debtorsCount?: number;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  invoiceNumber,
  paymentType,
  onPaymentTypeChange,
  onPrint,
  onSave,
  onHistory,
  onOpenReports,
  onCopy,
  historyCount,
  itemsCount,
  onReset,
  isDark,
  onToggleDark,
  onClearAll,
  onOpenSettings,
  onExitApp,
  onExportPdf,
  onExportExcel,
  onExportJpg,
  onShareWhatsAppImage,
  storeName = 'بقالة العزي',
  onOpenCustomers,
  onOpenCatalog,
  debtorsCount = 0,
}) => {
  return (
    <header className="no-print space-y-2 pt-1.5 pb-1 select-none">
      {/* 1. Primary Action Buttons Grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Print Button (Solid Emerald) */}
        <button
          id="btn-top-print"
          onClick={() => {
            sound.playTap();
            onPrint();
          }}
          disabled={itemsCount === 0}
          className="py-2.5 px-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
          title="طباعة حرارية فورية"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة</span>
        </button>

        {/* Save Button (White/Dark with Emerald border) */}
        <button
          id="btn-top-save"
          onClick={() => {
            sound.playTap();
            onSave();
          }}
          disabled={itemsCount === 0}
          className="py-2.5 px-1 bg-white dark:bg-slate-800 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 active:scale-95 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          title="حفظ في السجل"
        >
          <Save className="w-4 h-4" />
          <span>حفظ</span>
        </button>

        {/* History Button (White/Dark with Blue border & count) */}
        <button
          id="btn-top-history"
          onClick={() => {
            sound.playTap();
            onHistory();
          }}
          className="py-2.5 px-1 bg-white dark:bg-slate-800 border-2 border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 active:scale-95 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
          title="سجل الفواتير السابقة"
        >
          <History className="w-4 h-4" />
          <span>السجل</span>
          {historyCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
              {historyCount}
            </span>
          )}
        </button>

        {/* Reports Button (Replaces Copy button as requested) */}
        <button
          id="btn-top-reports"
          onClick={() => {
            sound.playTap();
            onOpenReports();
          }}
          className="py-2.5 px-1 bg-white dark:bg-slate-800 border-2 border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 active:scale-95 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
          title="عرض تقارير المبيعات والأرباح (يومي، شهري، سنوي)"
        >
          <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>التقارير</span>
        </button>
      </div>

      {/* 2. Fast Export and WhatsApp Image Chips */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 no-scrollbar text-xs">
        <div className="flex items-center gap-1.5">
          {/* WhatsApp as Image (Automatic) */}
          <button
            id="btn-top-whatsapp-img"
            onClick={() => {
              sound.playTap();
              if (onShareWhatsAppImage) onShareWhatsAppImage();
            }}
            disabled={itemsCount === 0}
            className="py-1 px-2.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 font-bold rounded-lg transition flex items-center gap-1 active:scale-95 disabled:opacity-40"
            title="مشاركة صورة الفاتورة تلقائياً عبر واتساب"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px]">واتساب (صورة)</span>
          </button>

          {/* PDF Export */}
          <button
            id="btn-top-export-pdf"
            onClick={() => {
              sound.playTap();
              if (onExportPdf) onExportPdf();
            }}
            disabled={itemsCount === 0}
            className="py-1 px-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-bold rounded-lg transition flex items-center gap-1 active:scale-95 disabled:opacity-40"
            title="تصدير ومشاركة ملف PDF"
          >
            <FileText className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span className="text-[11px]">PDF</span>
          </button>

          {/* Excel XLS Export */}
          <button
            id="btn-top-export-xls"
            onClick={() => {
              sound.playTap();
              if (onExportExcel) onExportExcel();
            }}
            disabled={itemsCount === 0}
            className="py-1 px-2 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold rounded-lg transition flex items-center gap-1 active:scale-95 disabled:opacity-40"
            title="تصدير ملف إكسل XLS"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="text-[11px]">Excel</span>
          </button>

          {/* JPG Image Export */}
          <button
            id="btn-top-export-jpg"
            onClick={() => {
              sound.playTap();
              if (onExportJpg) onExportJpg();
            }}
            disabled={itemsCount === 0}
            className="py-1 px-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold rounded-lg transition flex items-center gap-1 active:scale-95 disabled:opacity-40"
            title="تصدير صورة JPG عالية الدقة"
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-[11px]">JPG</span>
          </button>
        </div>

        {/* Action icons (Reset, Clear, Dark mode, Settings, Exit) */}
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <button
            id="btn-top-reset"
            onClick={() => {
              sound.playTap();
              onReset();
            }}
            title="فاتورة جديدة"
            className="p-1.5 text-red-500 hover:text-red-700 active:scale-90 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="btn-top-dark-toggle"
            onClick={() => {
              sound.playTap();
              onToggleDark();
            }}
            title="المظهر (داكن / فاتح)"
            className="p-1.5 text-slate-700 dark:text-amber-300 hover:text-slate-900 active:scale-90 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            id="btn-top-backup"
            onClick={() => {
              sound.playTap();
              onOpenSettings();
            }}
            title="الإعدادات والنسخ الاحتياطي"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 active:scale-90 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            id="btn-top-exit-app"
            onClick={() => {
              sound.playTap();
              onExitApp();
            }}
            title="تأكيد الخروج من التطبيق"
            className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-700 active:scale-90 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Invoice Number, Navigation, & Payment Type Pill */}
      <div className="flex items-center justify-between px-1 pt-0.5 gap-2">
        {/* Cash / Credit Pill */}
        <button
          id="btn-payment-type-pill"
          type="button"
          onClick={() => {
            sound.playTap();
            onPaymentTypeChange(paymentType === 'cash' ? 'credit' : 'cash');
          }}
          className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
            paymentType === 'cash'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
          }`}
        >
          <span>{paymentType === 'cash' ? 'نقدي (كاش)' : 'آجل (حساب ذمة)'}</span>
        </button>

        {/* Quick Navigation to Customers and Catalog */}
        <div className="flex items-center gap-1.5">
          {onOpenCustomers && (
            <button
              id="btn-nav-customers"
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenCustomers();
              }}
              className="py-1 px-2.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold rounded-full text-[11px] transition flex items-center gap-1 active:scale-95 border border-blue-200 dark:border-blue-800"
              title="دفتر حسابات وديون العملاء"
            >
              <Users className="w-3.5 h-3.5" />
              <span>العملاء</span>
              {debtorsCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                  {debtorsCount}
                </span>
              )}
            </button>
          )}

          {onOpenCatalog && (
            <button
              id="btn-nav-catalog"
              type="button"
              onClick={() => {
                sound.playTap();
                onOpenCatalog();
              }}
              className="py-1 px-2.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold rounded-full text-[11px] transition flex items-center gap-1 active:scale-95 border border-purple-200 dark:border-purple-800"
              title="دليل أصناف وأسعار البقالة"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>المنتجات</span>
            </button>
          )}
        </div>

        {/* Store Name & Invoice Number */}
        <div className="text-right">
          <span className="text-xs sm:text-sm font-black font-mono text-emerald-700 dark:text-emerald-400">
            فاتورة #{invoiceNumber}
          </span>
        </div>
      </div>
    </header>
  );
};

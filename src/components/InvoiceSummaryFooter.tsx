import React from 'react';
import {
  Printer,
  Bluetooth,
  Eye,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  MessageCircle,
} from 'lucide-react';
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
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  onExportJpg?: () => void;
  currency?: string;
  isDark?: boolean;
}

export const InvoiceSummaryFooter: React.FC<InvoiceSummaryFooterProps> = ({
  itemsCount,
  grandTotal,
  onPrint,
  onPrintBluetooth,
  onOpenPreview,
  onShareWhatsApp,
  onExportPdf,
  onExportExcel,
  onExportJpg,
  currency = 'ر.ي',
}) => {
  const safeTotal = parseArabicNumber(grandTotal);

  return (
    <div
      id="invoice-summary-footer"
      className="no-print bg-white dark:bg-slate-800/95 rounded-3xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 select-none"
    >
      {/* Total Display */}
      <div className="flex items-center justify-between px-1 gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 shrink-0">
          <span>عدد الأصناف:</span>
          <span className="font-mono font-bold text-sm bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 rounded-lg text-slate-800 dark:text-slate-100">
            {itemsCount}
          </span>
        </div>

        <div className="text-right max-w-[70%] overflow-hidden">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">الإجمالي المستحق:</div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
            {formatNumber(safeTotal)}{' '}
            <span className="text-xs font-bold font-sans text-slate-500 dark:text-slate-400">
              {currency}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Thermal Printing Actions */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/80">
        {/* Print Thermal */}
        <button
          id="btn-footer-thermal-print"
          onClick={() => {
            sound.playTap();
            onPrint();
          }}
          disabled={itemsCount === 0}
          className="py-2.5 px-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5"
          title="طباعة حرارية فورية للطابعة الموصولة"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة حرارية</span>
        </button>

        {/* Bluetooth RawBT / Web Bluetooth */}
        <button
          id="btn-footer-bluetooth-print"
          onClick={() => {
            sound.playTap();
            if (onPrintBluetooth) onPrintBluetooth();
          }}
          disabled={itemsCount === 0}
          className="py-2.5 px-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5"
          title="طباعة عبر طابعة بلوتوث أو تطبيق RawBT"
        >
          <Bluetooth className="w-4 h-4" />
          <span>طابعة بلوتوث</span>
        </button>

        {/* Preview / Thermal Hub */}
        <button
          id="btn-footer-preview"
          onClick={() => {
            sound.playTap();
            if (onOpenPreview) onOpenPreview();
          }}
          disabled={itemsCount === 0}
          className="py-2.5 px-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5"
          title="معاينة شكل الإيصال والخيارات المتقدمة"
        >
          <Eye className="w-4 h-4" />
          <span>معاينة الإيصال</span>
        </button>
      </div>

      {/* Multi-Format Export Bar (PDF, Excel, JPG, WhatsApp Image) */}
      <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/80">
        {/* WhatsApp Image */}
        <button
          id="btn-footer-whatsapp-img"
          onClick={() => {
            sound.playTap();
            onShareWhatsApp();
          }}
          disabled={itemsCount === 0}
          className="py-2 px-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 disabled:opacity-40 text-emerald-700 dark:text-emerald-300 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 active:scale-95"
          title="مشاركة صورة الفاتورة تلقائياً عبر واتساب"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>واتساب (صورة)</span>
        </button>

        {/* PDF Export */}
        <button
          id="btn-footer-export-pdf"
          onClick={() => {
            sound.playTap();
            if (onExportPdf) onExportPdf();
          }}
          disabled={itemsCount === 0}
          className="py-2 px-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 disabled:opacity-40 text-red-700 dark:text-red-300 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 active:scale-95"
          title="تصدير ومشاركة ملف PDF"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>تصدير PDF</span>
        </button>

        {/* Excel XLS Export */}
        <button
          id="btn-footer-export-xls"
          onClick={() => {
            sound.playTap();
            if (onExportExcel) onExportExcel();
          }}
          disabled={itemsCount === 0}
          className="py-2 px-1 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/60 disabled:opacity-40 text-teal-700 dark:text-teal-300 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 active:scale-95"
          title="تصدير جدول إكسل XLS"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>تصدير Excel</span>
        </button>

        {/* JPG Export */}
        <button
          id="btn-footer-export-jpg"
          onClick={() => {
            sound.playTap();
            if (onExportJpg) onExportJpg();
          }}
          disabled={itemsCount === 0}
          className="py-2 px-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 disabled:opacity-40 text-purple-700 dark:text-purple-300 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 active:scale-95"
          title="تصدير صورة JPG عالية الدقة"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>صورة JPG</span>
        </button>
      </div>
    </div>
  );
};

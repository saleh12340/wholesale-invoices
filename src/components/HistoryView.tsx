import React, { useState } from 'react';
import {
  Search,
  FileText,
  Trash2,
  Printer,
  Share2,
  RotateCcw,
  Calendar,
  Clock,
  User,
  Package,
  TrendingUp,
  FileSpreadsheet,
  Image as ImageIcon,
  MessageCircle,
  Download,
  ArrowRight,
} from 'lucide-react';
import { Invoice } from '../types';
import { formatNumber } from '../utils/arabic';
import { sound } from '../utils/audio';
import {
  exportInvoiceToPdf,
  exportInvoiceToExcel,
  exportInvoiceToJpg,
  shareInvoiceToWhatsAppAsImage,
  exportAllHistoryToExcel,
} from '../utils/exportTools';

interface HistoryViewProps {
  history: Invoice[];
  onRestore: (invoice: Invoice) => void;
  onDelete: (invoiceNumber: number) => void;
  onClearAll: () => void;
  onPrintInvoice: (invoice: Invoice) => void;
  onShareInvoice: (invoice: Invoice) => void;
  currency?: string;
  isDark?: boolean;
  storeName?: string;
  storeSubtitle?: string;
  storePhone?: string;
  thermalWidth?: '58mm' | '80mm';
  onBack?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onRestore,
  onDelete,
  onClearAll,
  onPrintInvoice,
  currency = 'ر.ي',
  storeName = 'بقالة العزي',
  storeSubtitle = 'للمواد الغذائية والاستهلاكية',
  storePhone,
  thermalWidth = '80mm',
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'cash' | 'credit'>('all');
  const [activeActionId, setActiveActionId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedThermalWidth: '58mm' | '80mm' = thermalWidth === '58mm' ? '58mm' : '80mm';

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const filteredHistory = history.filter((inv) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      inv.number.toString().includes(q) ||
      (inv.customer || '').toLowerCase().includes(q) ||
      inv.date.includes(q);

    if (!matchesQuery) return false;
    if (filterType === 'all') return true;
    return inv.paymentType === filterType;
  });

  const totalSalesSum = history.reduce((sum, inv) => sum + (inv.total || 0), 0);

  // Export single invoice to PDF
  const handleExportPdf = async (inv: Invoice) => {
    sound.playTap();
    showNotice(`جاري تصدير PDF للفاتورة #${inv.number}...`);
    const res = await exportInvoiceToPdf(inv, {
      storeName,
      storeSubtitle,
      storePhone,
      currency,
      thermalWidth: selectedThermalWidth,
    });
    if (res.success) sound.playSuccess();
    showNotice(res.message);
  };

  // Export single invoice to Excel
  const handleExportExcel = async (inv: Invoice) => {
    sound.playTap();
    showNotice(`جاري تصدير Excel للفاتورة #${inv.number}...`);
    const res = await exportInvoiceToExcel(inv, {
      storeName,
      currency,
    });
    if (res.success) sound.playSuccess();
    showNotice(res.message);
  };

  // Export single invoice to JPG
  const handleExportJpg = async (inv: Invoice) => {
    sound.playTap();
    showNotice(`جاري تصدير صورة JPG للفاتورة #${inv.number}...`);
    const res = await exportInvoiceToJpg(inv, {
      storeName,
      storeSubtitle,
      storePhone,
      currency,
      thermalWidth: selectedThermalWidth,
    });
    if (res.success) sound.playSuccess();
    showNotice(res.message);
  };

  // WhatsApp as Image (Automatic)
  const handleWhatsAppImage = async (inv: Invoice) => {
    sound.playTap();
    showNotice(`جاري تجهيز صورة الفاتورة #${inv.number} للواتساب...`);
    const res = await shareInvoiceToWhatsAppAsImage(inv, {
      storeName,
      storeSubtitle,
      storePhone,
      currency,
      thermalWidth: selectedThermalWidth,
    });
    if (res.success) sound.playSuccess();
    showNotice(res.message);
  };

  // Export entire history
  const handleExportAllToExcel = async () => {
    sound.playTap();
    if (history.length === 0) {
      showNotice('لا توجد فواتير لتصديرها');
      return;
    }
    showNotice('جاري تصدير سجل المبيعات بالكامل...');
    const res = await exportAllHistoryToExcel(history, {
      storeName,
      currency,
    });
    if (res.success) sound.playSuccess();
    showNotice(res.message);
  };

  return (
    <div id="history-view-container" className="space-y-3 select-none">
      {/* Return to POS Invoice Button */}
      {onBack && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-800/90 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <button
            id="btn-history-back-pos"
            onClick={() => {
              sound.playTap();
              onBack();
            }}
            className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لشاشة الفاتورة الرئيسية</span>
          </button>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 font-mono">
            {history.length} فواتير مؤرشفة
          </span>
        </div>
      )}

      {/* Toast Notice */}
      {notice && (
        <div className="bg-emerald-600 text-white text-xs px-3 py-2 rounded-xl text-center font-bold shadow-md">
          {notice}
        </div>
      )}

      {/* Sales Summary Banner */}
      <div className="bg-gradient-to-l from-blue-600 to-indigo-700 dark:from-blue-900 dark:to-indigo-950 text-white p-4 rounded-3xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-blue-100 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-blue-200" />
              <span>إجمالي المبيعات المؤرشفة</span>
            </div>
            <div className="text-2xl font-black font-mono mt-0.5 tracking-tight">
              {formatNumber(totalSalesSum)}{' '}
              <span className="text-xs font-bold font-sans text-blue-200">{currency}</span>
            </div>
          </div>

          <div className="text-left bg-white/10 px-3.5 py-1.5 rounded-2xl border border-white/15">
            <div className="text-[10px] text-blue-100 font-medium">عدد الفواتير</div>
            <div className="text-lg font-black font-mono">{history.length}</div>
          </div>
        </div>

        {/* Quick Export All to Excel Button */}
        {history.length > 0 && (
          <button
            id="btn-export-all-history"
            onClick={handleExportAllToExcel}
            className="w-full py-2 px-3 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-white/20"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>تصدير كامل سجل المبيعات إلى جدول إكسل (Excel)</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800/90 p-3 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5">
        <div className="relative">
          <input
            type="text"
            id="history-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الفاتورة، اسم العميل، أو التاريخ..."
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                sound.playTap();
                setFilterType('all');
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              الكل ({history.length})
            </button>
            <button
              onClick={() => {
                sound.playTap();
                setFilterType('cash');
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                filterType === 'cash'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              نقدي ({history.filter((h) => h.paymentType === 'cash').length})
            </button>
            <button
              onClick={() => {
                sound.playTap();
                setFilterType('credit');
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                filterType === 'credit'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              آجل ({history.filter((h) => h.paymentType === 'credit').length})
            </button>
          </div>

          {history.length > 0 && (
            <button
              onClick={() => {
                sound.playTap();
                onClearAll();
              }}
              className="text-[11px] text-red-500 hover:text-red-700 font-bold transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح السجل</span>
            </button>
          )}
        </div>
      </div>

      {/* History Items List */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-500 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            لا توجد فواتير تطابق البحث
          </p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            عند حفظ الفواتير من شاشة المبيعات، ستظهر هنا في السجل التاريخي فوراً مع إمكانية طباعتها ومشاركتها كـ PDF وExcel وصورة JPG وواتساب.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[550px] overflow-y-auto pr-0.5">
          {filteredHistory.map((inv) => (
            <div
              key={inv.id || inv.number}
              id={`history-card-${inv.number}`}
              className="bg-white dark:bg-slate-800/90 rounded-3xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5 hover:border-blue-400 transition"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg">
                    #{inv.number}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inv.paymentType === 'credit'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                    }`}
                  >
                    {inv.paymentType === 'credit' ? 'آجل (ذمة)' : 'نقدي'}
                  </span>
                </div>

                <div className="text-right font-mono font-black text-base text-emerald-700 dark:text-emerald-400">
                  {formatNumber(inv.total)} {currency}
                </div>
              </div>

              {/* Customer & Info */}
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5 font-bold">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{inv.customer || 'عميل نقدي'}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Package className="w-3.5 h-3.5" />
                  <span>{inv.items.length} أصناف</span>
                </div>
              </div>

              {/* Date & Time and Last Modified */}
              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{inv.date}</span>
                  {inv.time && <span>• {inv.time}</span>}
                </div>
                {inv.lastModified && (
                  <div className="text-amber-700 dark:text-amber-400 font-sans font-bold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                    <Clock className="w-2.5 h-2.5" />
                    <span>آخر تعديل:</span>
                    <span className="font-mono">{inv.lastModified}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons Row 1: Restore, Thermal Print, WhatsApp Image */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1.5">
                <button
                  onClick={() => {
                    sound.playTap();
                    onRestore(inv);
                  }}
                  className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs active:scale-95"
                  title="استكمال وتحرير الفاتورة في شاشة الكاشير"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استكمال وتعديل</span>
                </button>

                <button
                  onClick={() => {
                    sound.playTap();
                    onPrintInvoice(inv);
                  }}
                  title="طباعة حرارية فورية"
                  className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>

                <button
                  onClick={() => handleWhatsAppImage(inv)}
                  title="مشاركة صورة الفاتورة تلقائياً عبر واتساب"
                  className="py-1.5 px-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>واتساب</span>
                </button>

                <button
                  onClick={() => {
                    sound.playTap();
                    onDelete(inv.number);
                  }}
                  title="حذف من السجل"
                  className="p-1.5 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 rounded-xl transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action Buttons Row 2: Direct PDF, Excel, JPG Chips */}
              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-dashed border-slate-100 dark:border-slate-700/60">
                <button
                  onClick={() => handleExportPdf(inv)}
                  className="py-1 px-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 active:scale-95"
                  title="تصدير ملف PDF"
                >
                  <FileText className="w-3 h-3 text-red-500" />
                  <span>PDF</span>
                </button>

                <button
                  onClick={() => handleExportExcel(inv)}
                  className="py-1 px-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 active:scale-95"
                  title="تصدير جدول Excel"
                >
                  <FileSpreadsheet className="w-3 h-3 text-teal-500" />
                  <span>Excel</span>
                </button>

                <button
                  onClick={() => handleExportJpg(inv)}
                  className="py-1 px-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 active:scale-95"
                  title="تصدير صورة JPG"
                >
                  <ImageIcon className="w-3 h-3 text-purple-500" />
                  <span>JPG</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

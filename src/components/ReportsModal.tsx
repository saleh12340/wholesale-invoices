import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  BarChart3,
  TrendingUp,
  DollarSign,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Printer,
  Clock,
  ArrowDownToLine,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { Invoice } from '../types';
import { formatNumber } from '../utils/arabic';
import { sound } from '../utils/audio';
import { exportReportToExcel, exportReportToPdf } from '../utils/exportTools';
import { printThermalReceipt } from '../utils/thermalPrinter';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: Invoice[];
  currency?: string;
  storeName?: string;
  storeSubtitle?: string;
  storePhone?: string;
  thermalWidth?: '58mm' | '80mm';
  onSelectInvoiceToView?: (invoice: Invoice) => void;
}

type PeriodType = 'daily' | 'monthly' | 'yearly';

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  onClose,
  history,
  currency = 'ر.ي',
  storeName = 'بقالة العزي',
  storeSubtitle = 'للمواد الغذائية والاستهلاكية',
  storePhone,
  thermalWidth = '80mm',
  onSelectInvoiceToView,
}) => {
  if (!isOpen) return null;

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const currentMonthIso = now.toISOString().slice(0, 7); // YYYY-MM
  const currentYearStr = now.getFullYear().toString();

  const [periodType, setPeriodType] = useState<PeriodType>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthIso);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | 'thermal' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Helper to parse date from invoice
  // Invoice date can be YYYY-MM-DD or formatted like "2026/09/08" or timestamp
  const parseInvDate = (inv: Invoice): { year: string; month: string; day: string; dateStr: string } => {
    let d: Date;
    if (inv.timestamp && !isNaN(inv.timestamp)) {
      d = new Date(inv.timestamp);
    } else {
      const sanitized = inv.date.replace(/[/]/g, '-');
      d = new Date(sanitized);
    }
    if (isNaN(d.getTime())) {
      d = new Date();
    }
    const year = d.getFullYear().toString();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return {
      year,
      month: `${year}-${m}`,
      day: `${year}-${m}-${day}`,
      dateStr: `${year}-${m}-${day}`,
    };
  };

  // Filter invoices according to selected period
  const filteredInvoices = useMemo(() => {
    return history.filter((inv) => {
      const { year, month, day } = parseInvDate(inv);
      if (periodType === 'daily') {
        return day === selectedDate || inv.date === selectedDate || inv.date.replace(/[/]/g, '-') === selectedDate;
      } else if (periodType === 'monthly') {
        return month === selectedMonth || (inv.date && inv.date.startsWith(selectedMonth.replace('-', '/')));
      } else {
        return year === selectedYear || (inv.date && inv.date.startsWith(selectedYear));
      }
    });
  }, [history, periodType, selectedDate, selectedMonth, selectedYear]);

  // Aggregate statistics
  const stats = useMemo(() => {
    let totalSales = 0;
    let totalProfit = 0;
    let cashSales = 0;
    let creditSales = 0;

    filteredInvoices.forEach((inv) => {
      const invTotal = inv.total || 0;
      totalSales += invTotal;

      if (inv.paymentType === 'credit') {
        creditSales += invTotal;
      } else {
        cashSales += invTotal;
      }

      // Profit calculation: use stored profit, or calculate from item costPrice, or fallback to ~18%
      if (inv.profit !== undefined) {
        totalProfit += inv.profit;
      } else if (inv.items && inv.items.length > 0) {
        let invProf = 0;
        let hasCustomCost = false;
        inv.items.forEach((it) => {
          if (it.costPrice !== undefined && it.costPrice > 0) {
            hasCustomCost = true;
            invProf += (it.unitPrice - it.costPrice) * it.qty;
          }
        });
        if (hasCustomCost) {
          totalProfit += Math.max(0, invProf);
        } else {
          totalProfit += Math.round(invTotal * 0.18);
        }
      } else {
        totalProfit += Math.round(invTotal * 0.18);
      }
    });

    const invoicesCount = filteredInvoices.length;
    const avgTicket = invoicesCount > 0 ? Math.round(totalSales / invoicesCount) : 0;
    const profitMargin = totalSales > 0 ? Math.round((totalProfit / totalSales) * 100) : 0;

    return {
      totalSales,
      totalProfit,
      cashSales,
      creditSales,
      invoicesCount,
      avgTicket,
      profitMargin,
    };
  }, [filteredInvoices]);

  const periodLabel = useMemo(() => {
    if (periodType === 'daily') {
      return `يوم ${selectedDate}`;
    } else if (periodType === 'monthly') {
      return `شهر ${selectedMonth}`;
    } else {
      return `عام ${selectedYear}`;
    }
  }, [periodType, selectedDate, selectedMonth, selectedYear]);

  // Export to Excel handler
  const handleExportExcel = async () => {
    sound.playTap();
    setIsExporting('excel');
    showStatus('جاري تجهيز تقرير الإكسل وحفظه في مجلد التنزيلات...');
    const res = await exportReportToExcel(
      {
        periodType,
        periodLabel,
        totalSales: stats.totalSales,
        totalProfit: stats.totalProfit,
        cashSales: stats.cashSales,
        creditSales: stats.creditSales,
        invoicesCount: stats.invoicesCount,
        invoices: filteredInvoices,
      },
      { storeName, currency }
    );
    setIsExporting(null);
    if (res.success) {
      sound.playSuccess();
      showStatus(res.message);
    } else {
      sound.playError();
      showStatus(res.message);
    }
  };

  // Export to PDF handler
  const handleExportPdf = async () => {
    sound.playTap();
    setIsExporting('pdf');
    showStatus('جاري إنشاء تقرير PDF وتنزيله...');
    const res = await exportReportToPdf(
      {
        periodType,
        periodLabel,
        totalSales: stats.totalSales,
        totalProfit: stats.totalProfit,
        cashSales: stats.cashSales,
        creditSales: stats.creditSales,
        invoicesCount: stats.invoicesCount,
        invoices: filteredInvoices,
      },
      { storeName, currency }
    );
    setIsExporting(null);
    if (res.success) {
      sound.playSuccess();
      showStatus(res.message);
    } else {
      sound.playError();
      showStatus(res.message);
    }
  };

  // Print thermal summary receipt for the report
  const handleThermalPrintReport = () => {
    sound.playTap();
    setIsExporting('thermal');

    const reportInvoiceMock: Invoice = {
      id: `report-${Date.now()}`,
      number: filteredInvoices.length,
      customer: `تقرير مبيعات (${periodLabel})`,
      date: new Date().toLocaleDateString('ar-YE'),
      time: new Date().toLocaleTimeString('ar-YE'),
      timestamp: Date.now(),
      paymentType: 'cash',
      items: [
        {
          id: 'rep-1',
          name: `إجمالي المبيعات (${stats.invoicesCount} فاتورة)`,
          qty: 1,
          unitPrice: stats.totalSales,
          total: stats.totalSales,
        },
        {
          id: 'rep-2',
          name: 'المبيعات النقدية',
          qty: 1,
          unitPrice: stats.cashSales,
          total: stats.cashSales,
        },
        {
          id: 'rep-3',
          name: 'المبيعات الآجلة (ذمم)',
          qty: 1,
          unitPrice: stats.creditSales,
          total: stats.creditSales,
        },
        {
          id: 'rep-4',
          name: 'صافي الأرباح المقدرة',
          qty: 1,
          unitPrice: stats.totalProfit,
          total: stats.totalProfit,
        },
      ],
      total: stats.totalSales,
      notes: `تقرير مالي تفصيلي للمبيعات والأرباح - تم إنشاؤه آلياً`,
    };

    printThermalReceipt(reportInvoiceMock, {
      storeName,
      storeSubtitle: `تقرير المبيعات: ${periodLabel}`,
      storePhone,
      currency,
      thermalWidth,
    });

    setIsExporting(null);
    showStatus('تم إرسال تقرير المبيعات لطابعة الإيصالات الحرارية');
  };

  return (
    <div
      id="reports-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 no-print select-none"
      onClick={onClose}
    >
      <div
        id="reports-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base leading-tight">تقارير المبيعات والأرباح</h2>
              <p className="text-[11px] text-slate-400">
                {storeName} • كشف يومي، شهري، وسنوي مفصل
              </p>
            </div>
          </div>

          <button
            id="btn-close-reports"
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Toast Banner */}
        {notice && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-white/80 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Period Tabs & Date Pickers */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/80 space-y-2.5">
          {/* Period Mode Selector */}
          <div className="grid grid-cols-3 gap-1.5 bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              id="tab-daily-report"
              onClick={() => {
                sound.playTap();
                setPeriodType('daily');
              }}
              className={`py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                periodType === 'daily'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>تقرير يومي</span>
            </button>

            <button
              id="tab-monthly-report"
              onClick={() => {
                sound.playTap();
                setPeriodType('monthly');
              }}
              className={`py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                periodType === 'monthly'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>تقرير شهري</span>
            </button>

            <button
              id="tab-yearly-report"
              onClick={() => {
                sound.playTap();
                setPeriodType('yearly');
              }}
              className={`py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                periodType === 'yearly'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>تقرير سنوي</span>
            </button>
          </div>

          {/* Date Selector Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <span>الفترة المحددة:</span>
              <span className="text-amber-600 dark:text-amber-400 font-mono">{periodLabel}</span>
            </div>

            <div className="flex items-center gap-2">
              {periodType === 'daily' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono outline-none"
                />
              )}

              {periodType === 'monthly' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono outline-none"
                />
              )}

              {periodType === 'yearly' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono outline-none"
                >
                  {Array.from({ length: 6 }).map((_, i) => {
                    const yr = (now.getFullYear() - 3 + i).toString();
                    return (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-4 flex-1">
          {/* Key Metrics Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Total Sales */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-1">
                إجمالي المبيعات
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white">
                {formatNumber(stats.totalSales)}
                <span className="text-[10px] font-sans font-normal text-slate-400 mr-1">{currency}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {stats.invoicesCount} فاتورة
              </div>
            </div>

            {/* Total Profit */}
            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
              <div className="text-[11px] text-emerald-800 dark:text-emerald-400 font-bold mb-1 flex items-center justify-between">
                <span>صافي الأرباح</span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-1 rounded">
                  {stats.profitMargin}%
                </span>
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                {formatNumber(stats.totalProfit)}
                <span className="text-[10px] font-sans font-normal text-emerald-600/70 mr-1">{currency}</span>
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400/80 mt-0.5">
                هامش ربح تقريبي
              </div>
            </div>

            {/* Cash Sales */}
            <div className="bg-blue-50/80 dark:bg-blue-950/30 p-3 rounded-2xl border border-blue-200 dark:border-blue-800/60">
              <div className="text-[11px] text-blue-800 dark:text-blue-400 font-bold mb-1">
                المبيعات النقدية
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-blue-700 dark:text-blue-400">
                {formatNumber(stats.cashSales)}
                <span className="text-[10px] font-sans font-normal text-blue-600/70 mr-1">{currency}</span>
              </div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400/80 mt-0.5">
                تحصيل نقدي فوري
              </div>
            </div>

            {/* Credit / Debts Sales */}
            <div className="bg-amber-50/80 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-200 dark:border-amber-800/60">
              <div className="text-[11px] text-amber-800 dark:text-amber-400 font-bold mb-1">
                المبيعات الآجلة (ذمم)
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-amber-700 dark:text-amber-400">
                {formatNumber(stats.creditSales)}
                <span className="text-[10px] font-sans font-normal text-amber-600/70 mr-1">{currency}</span>
              </div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400/80 mt-0.5">
                ديون مستحقة للعملاء
              </div>
            </div>
          </div>

          {/* Cash vs Credit Ratio Bar */}
          {stats.totalSales > 0 && (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300">نسبة التحصيل (نقدي مقابل آجل)</span>
                <span className="text-slate-500 font-mono text-[11px]">
                  نقدي: {Math.round((stats.cashSales / stats.totalSales) * 100)}% • آجل: {Math.round((stats.creditSales / stats.totalSales) * 100)}%
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                <div
                  className="bg-blue-600 h-full transition-all duration-500"
                  style={{ width: `${(stats.cashSales / stats.totalSales) * 100}%` }}
                  title="المبيعات النقدية"
                />
                <div
                  className="bg-amber-500 h-full transition-all duration-500"
                  style={{ width: `${(stats.creditSales / stats.totalSales) * 100}%` }}
                  title="المبيعات الآجلة"
                />
              </div>
            </div>
          )}

          {/* Invoices Breakdown Table with Edit History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                <span>فواتير الفترة وعمليات التعديل ({filteredInvoices.length})</span>
              </div>
              <span className="text-[11px] text-slate-400">مرتبة من الأحدث إلى الأقدم</span>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center text-slate-400 text-xs border border-dashed border-slate-300 dark:border-slate-700">
                لا توجد فواتير مسجلة في {periodLabel}
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
                <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInvoices.map((inv) => {
                    const invProfit = inv.profit !== undefined ? inv.profit : Math.round(inv.total * 0.18);
                    return (
                      <div
                        key={inv.id || inv.number}
                        className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                              #{inv.number}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {inv.customer || 'عميل نقدي'}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                inv.paymentType === 'credit'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {inv.paymentType === 'credit' ? 'آجل' : 'نقدي'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400 font-mono">
                            <span>{inv.date} {inv.time || ''}</span>
                            <span>• {inv.items.length} أصناف</span>

                            {/* Exact Last Modified Date & Time */}
                            {inv.lastModified && (
                              <span className="text-amber-700 dark:text-amber-400 font-sans font-bold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                                <Clock className="w-2.5 h-2.5" />
                                <span>آخر تعديل:</span>
                                <span className="font-mono">{inv.lastModified}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-left space-y-0.5">
                          <div className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                            {formatNumber(inv.total)} {currency}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ربح: {formatNumber(invProfit)} {currency}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            الحفظ يتم فعلياً داخل مجلد <span className="font-bold text-slate-800 dark:text-slate-200">Downloads</span> بالهاتف
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Export Excel Button */}
            <button
              id="btn-report-export-excel"
              onClick={handleExportExcel}
              disabled={isExporting !== null || filteredInvoices.length === 0}
              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              title="تصدير جدول إكسل وحفظه في التنزيلات"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>إكسل Excel</span>
            </button>

            {/* Export PDF Button */}
            <button
              id="btn-report-export-pdf"
              onClick={handleExportPdf}
              disabled={isExporting !== null || filteredInvoices.length === 0}
              className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              title="تصدير تقرير PDF وحفظه في التنزيلات"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>تقرير PDF</span>
            </button>

            {/* Thermal Print Report Button */}
            <button
              id="btn-report-thermal-print"
              onClick={handleThermalPrintReport}
              disabled={filteredInvoices.length === 0}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs border border-slate-600"
              title="طباعة ملخص التقرير على طابعة الإيصالات الحرارية"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>طباعة حرارية</span>
            </button>

            {/* Direct Window Print */}
            <button
              id="btn-report-native-print"
              onClick={() => {
                sound.playTap();
                window.print();
              }}
              className="py-1.5 px-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
              title="استدعاء نافذة الطباعة الخاصة بالنظام"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>نافذة الطباعة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Printer,
  Share2,
  Copy,
  Bluetooth,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Check,
  FileText,
  FileSpreadsheet,
  MessageCircle,
} from 'lucide-react';
import { Invoice } from '../types';
import { formatNumber, formatUnitPrice, parseArabicNumber } from '../utils/arabic';
import { sound } from '../utils/audio';
import { downloadReceiptImage, shareReceiptImage, renderReceiptToCanvas } from '../utils/receiptCanvas';
import { printThermalReceiptViaNewWindow, printViaRawBT, printViaRawBTImage } from '../utils/thermalPrinter';
import {
  exportInvoiceToPdf,
  exportInvoiceToExcel,
  exportInvoiceToJpg,
  shareInvoiceToWhatsAppAsImage,
} from '../utils/exportTools';

interface ThermalPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  storeName: string;
  storeSubtitle: string;
  storePhone?: string;
  currency?: string;
  thermalWidth?: '58mm' | '80mm';
  onPrint: () => void;
  onPrintBluetooth?: () => void;
  onShareWhatsApp: () => void;
  onCopyText: () => void;
}

export const ThermalPreviewModal: React.FC<ThermalPreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  storeName,
  storeSubtitle,
  storePhone,
  currency = 'ر.ي',
  thermalWidth = '80mm',
  onPrint,
  onPrintBluetooth,
  onCopyText,
}) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const resolvedWidth: '58mm' | '80mm' = thermalWidth === '58mm' ? '58mm' : '80mm';

  if (!isOpen) return null;

  const showStatus = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Export PDF
  const handleExportPdf = async (action: 'download' | 'share' = 'download') => {
    sound.playTap();
    setDownloading('pdf');
    const res = await exportInvoiceToPdf(
      invoice,
      {
        storeName,
        storeSubtitle,
        storePhone,
        currency,
        thermalWidth: resolvedWidth,
      },
      action
    );
    setDownloading(null);
    if (res.success) {
      sound.playSuccess();
      showStatus(res.message);
    } else {
      sound.playError();
      showStatus(res.message);
    }
  };

  // Export Excel XLS
  const handleExportExcel = async (action: 'download' | 'share' = 'download') => {
    sound.playTap();
    setDownloading('excel');
    const res = await exportInvoiceToExcel(
      invoice,
      {
        storeName,
        currency,
      },
      action
    );
    setDownloading(null);
    if (res.success) {
      sound.playSuccess();
      showStatus(res.message);
    } else {
      sound.playError();
      showStatus(res.message);
    }
  };

  // Export JPG
  const handleExportJpg = async (action: 'download' | 'share' = 'download') => {
    sound.playTap();
    setDownloading('jpg');
    const res = await exportInvoiceToJpg(
      invoice,
      {
        storeName,
        storeSubtitle,
        storePhone,
        currency,
        thermalWidth: resolvedWidth,
      },
      action
    );
    setDownloading(null);
    if (res.success) {
      sound.playSuccess();
      showStatus(res.message);
    } else {
      sound.playError();
      showStatus(res.message);
    }
  };

  // WhatsApp as Image (Automatic)
  const handleWhatsAppImageShare = async () => {
    sound.playTap();
    setDownloading('whatsapp');
    const res = await shareInvoiceToWhatsAppAsImage(invoice, {
      storeName,
      storeSubtitle,
      storePhone,
      currency,
      thermalWidth: resolvedWidth,
    });
    setDownloading(null);
    if (res.success) {
      sound.playSuccess();
      showStatus(res.message);
    } else {
      showStatus(res.message);
    }
  };

  // Download PNG Image
  const handleDownloadPng = async () => {
    sound.playTap();
    setDownloading('png');
    try {
      await downloadReceiptImage(invoice, {
        storeName,
        storeSubtitle,
        storePhone,
        currency,
        thermalWidth: resolvedWidth,
      });
      sound.playSuccess();
      showStatus('تم حفظ صورة الإيصال (PNG) في الاستوديو');
    } catch (e) {
      console.error('Download PNG error:', e);
      sound.playError();
    } finally {
      setDownloading(null);
    }
  };

  // RawBT Image print (100% Arabic fidelity)
  const handleRawBtImage = () => {
    sound.playTap();
    try {
      const canvas = renderReceiptToCanvas(invoice, {
        storeName,
        storeSubtitle,
        storePhone,
        currency,
        thermalWidth: resolvedWidth,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const ok = printViaRawBTImage(dataUrl);
      if (ok) {
        sound.playSuccess();
        showStatus('تم إرسال صورة الإيصال لتطبيق RawBT للطباعة الحرارية');
      } else {
        sound.playError();
        showStatus('تعذر فتح تطبيق RawBT');
      }
    } catch (e) {
      console.error('Error printing image via RawBT:', e);
      sound.playError();
    }
  };

  const handleOpenNewWindow = () => {
    sound.playTap();
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    } else {
      printThermalReceiptViaNewWindow(invoice, {
        storeName,
        storeSubtitle,
        storePhone,
        currency,
        thermalWidth: resolvedWidth,
      });
    }
  };

  const handleRawBtApp = () => {
    sound.playTap();
    printViaRawBT(invoice, {
      storeName,
      storeSubtitle,
      storePhone,
      currency,
      thermalWidth: resolvedWidth,
    });
  };

  const handleCopy = () => {
    sound.playTap();
    onCopyText();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="thermal-preview-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 no-print select-none"
      onClick={onClose}
    >
      <div
        id="thermal-preview-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh]"
      >
        {/* Header */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                مركز الطباعة والتصدير والمشاركة
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                فاتورة #{invoice.number} • عرض الورق: {resolvedWidth}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification */}
        {statusNotice && (
          <div className="bg-emerald-600 text-white text-xs px-3 py-2 text-center font-bold animate-pulse">
            {statusNotice}
          </div>
        )}

        {/* Realistic Thermal Receipt Paper Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div
            id="receipt-paper"
            style={{ width: resolvedWidth === '58mm' ? '280px' : '340px' }}
            className="bg-white text-black p-4 rounded-xl shadow-lg border border-slate-300 font-mono text-xs leading-relaxed select-text"
          >
            {/* Store Header */}
            <div className="text-center space-y-1 mb-3">
              <h2 className="text-lg font-black tracking-tight">{storeName}</h2>
              <p className="text-[11px] text-slate-700">{storeSubtitle}</p>
              {storePhone && <p className="text-[11px] text-slate-700">هاتف: {storePhone}</p>}
            </div>

            <div className="my-2 border-b border-dashed border-slate-400"></div>

            {/* Metadata */}
            <div className="flex justify-between text-[11px] my-1 font-sans">
              <span>فاتورة #: {invoice.number}</span>
              <span>{invoice.time} {invoice.date}</span>
            </div>
            <div className="flex justify-between text-[11px] my-1 font-sans">
              <span>العميل: {invoice.customer || 'نقدي'}</span>
              <span className="font-bold">
                {invoice.paymentType === 'credit' ? 'آجل (ذمة)' : 'نقدي'}
              </span>
            </div>

            <div className="my-2 border-b border-dashed border-slate-400"></div>

            {/* Items */}
            <div className="space-y-1.5 my-2">
              {invoice.items.length === 0 ? (
                <div className="text-center text-slate-400 py-3">-- لا توجد أصناف --</div>
              ) : (
                invoice.items.map((it, idx) => {
                  const qty = it.qty || 1;
                  const total = parseArabicNumber(it.total) || 0;
                  const unitPrice = formatUnitPrice(qty > 0 ? total / qty : 0);
                  return (
                    <div key={idx} className="text-xs">
                      <div className="font-bold text-slate-950 font-sans">
                        {idx + 1}. {it.name || 'صنف'}
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-700 mt-0.5">
                        <span>الكمية: {qty} × {unitPrice}</span>
                        <span className="font-bold text-slate-900">
                          {formatNumber(total)} {currency}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="my-2 border-b border-dashed border-slate-400"></div>

            {/* Totals */}
            <div className="flex justify-between items-center font-black text-sm text-slate-950 my-1">
              <span>الإجمالي الكلي:</span>
              <span>{formatNumber(invoice.total)} {currency}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-700 my-1">
              <span>عدد الأصناف:</span>
              <span>{invoice.items.length}</span>
            </div>

            <div className="my-2 border-b border-dashed border-slate-400"></div>

            <div className="text-center text-[11px] text-slate-600 mt-2 leading-tight">
              شكراً لزيارتكم {storeName}<br />
              يرجى الاحتفاظ بالإيصال
            </div>
          </div>
        </div>

        {/* Modal Actions - Multi-Tier Printing Hub */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
          {/* Section 1: Multi-Format Exports (PDF, Excel, JPG, WhatsApp Image) */}
          <div className="grid grid-cols-4 gap-1.5">
            {/* WhatsApp Automatic Image */}
            <button
              onClick={handleWhatsAppImageShare}
              disabled={downloading !== null}
              className="py-2 px-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95 disabled:opacity-50"
              title="مشاركة صورة الفاتورة تلقائياً عبر واتساب"
            >
              <MessageCircle className="w-4 h-4" />
              <span>واتساب (صورة)</span>
            </button>

            {/* PDF Export */}
            <button
              onClick={() => handleExportPdf('download')}
              disabled={downloading !== null}
              className="py-2 px-1 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-bold transition flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95 disabled:opacity-50"
              title="تصدير ملف PDF عالي الجودة"
            >
              <FileText className="w-4 h-4" />
              <span>تصدير PDF</span>
            </button>

            {/* Excel XLS Export */}
            <button
              onClick={() => handleExportExcel('download')}
              disabled={downloading !== null}
              className="py-2 px-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[11px] font-bold transition flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95 disabled:opacity-50"
              title="تصدير جدول بيانات إكسل XLS"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير Excel</span>
            </button>

            {/* JPG Export */}
            <button
              onClick={() => handleExportJpg('download')}
              disabled={downloading !== null}
              className="py-2 px-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-bold transition flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95 disabled:opacity-50"
              title="تصدير صورة JPG عالية الدقة"
            >
              <ImageIcon className="w-4 h-4" />
              <span>صورة JPG</span>
            </button>
          </div>

          {/* Section 2: Thermal Printing Suite */}
          <div className="grid grid-cols-3 gap-2">
            {/* Direct Thermal Print */}
            <button
              onClick={() => {
                sound.playTap();
                onPrint();
              }}
              className="py-2.5 px-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
              title="طباعة حرارية فورية عبر نظام التشغيل"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة فورية</span>
            </button>

            {/* Direct Bluetooth */}
            <button
              onClick={() => {
                sound.playTap();
                if (onPrintBluetooth) onPrintBluetooth();
              }}
              className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
              title="الاتصال المباشر بطابعات البلوتوث"
            >
              <Bluetooth className="w-4 h-4" />
              <span>طابعة بلوتوث</span>
            </button>

            {/* RawBT Image (Guaranteed Arabic) */}
            <button
              onClick={handleRawBtImage}
              className="py-2.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
              title="طباعة الإيصال كصورة عبر RawBT لضمان وضوح الحروف العربية 100% دون تقطيع"
            >
              <ImageIcon className="w-4 h-4" />
              <span>RawBT صورة</span>
            </button>
          </div>

          {/* Section 3: Extra Tools (RawBT Text, Standalone Window, PNG Download, Copy) */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            <button
              onClick={handleRawBtApp}
              className="py-1.5 px-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
              title="إرسال نص الفاتورة لتطبيق RawBT"
            >
              <span>RawBT نص</span>
            </button>

            <button
              id="btn-print-window-native"
              onClick={handleOpenNewWindow}
              className="py-1.5 px-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
              title="استدعاء نافذة الطباعة الخاصة بالنظام أو المتصفح مباشرة (window.print)"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>نافذة طباعة</span>
            </button>

            <button
              onClick={handleDownloadPng}
              disabled={downloading !== null}
              className="py-1.5 px-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
              title="حفظ صورة PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>حفظ PNG</span>
            </button>

            <button
              onClick={handleCopy}
              className="py-1.5 px-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
              title="نسخ نص الفاتورة للحافظة"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم النسخ' : 'نسخ نص'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

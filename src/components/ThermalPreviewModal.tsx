import React, { useState } from 'react';
import { X, Printer, Share2, Copy, Bluetooth, Download, ExternalLink, Image as ImageIcon, Check } from 'lucide-react';
import { Invoice } from '../types';
import { formatNumber, formatUnitPrice, parseArabicNumber } from '../utils/arabic';
import { sound } from '../utils/audio';
import { downloadReceiptImage, shareReceiptImage } from '../utils/receiptCanvas';
import { printThermalReceiptViaNewWindow, printViaRawBT } from '../utils/thermalPrinter';

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
  onShareWhatsApp,
  onCopyText,
}) => {
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [copied, setCopied] = useState(false);

  const resolvedWidth: '58mm' | '80mm' = thermalWidth === '58mm' ? '58mm' : '80mm';

  if (!isOpen) return null;

  const handleDownloadImage = async () => {
    sound.playTap();
    setDownloadingImage(true);
    try {
      await downloadReceiptImage(invoice, {
        storeName,
        storeSubtitle,
        storePhone,
        currency,
        thermalWidth: resolvedWidth,
      });
      sound.playSuccess();
    } catch (e) {
      console.error('Download image error:', e);
      sound.playError();
    } finally {
      setDownloadingImage(false);
    }
  };

  const handleShareImage = async () => {
    sound.playTap();
    try {
      const shared = await shareReceiptImage(invoice, {
        storeName,
        storeSubtitle,
        storePhone,
        currency,
        thermalWidth: resolvedWidth,
      });
      if (shared) sound.playSuccess();
    } catch (e) {
      console.error('Share image error:', e);
    }
  };

  const handleOpenNewWindow = () => {
    sound.playTap();
    printThermalReceiptViaNewWindow(invoice, {
      storeName,
      storeSubtitle,
      storePhone,
      currency,
      thermalWidth: resolvedWidth,
    });
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
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 no-print"
      onClick={onClose}
    >
      <div
        id="thermal-preview-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm">
            <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>مركز الطباعة الحرارية والمشاركة</span>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Receipt Simulation */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950/60 flex justify-center">
          <div className="w-full max-w-[310px] bg-white text-slate-900 p-4 shadow-md font-mono text-xs border border-slate-300 relative select-text rounded-xs">
            {/* Store Header */}
            <div className="text-center font-bold text-base tracking-tight text-slate-950 mb-1">
              {storeName}
            </div>
            <div className="text-center text-[11px] text-slate-600 mb-1">
              {storeSubtitle}
            </div>
            {storePhone && (
              <div className="text-center text-[11px] text-slate-600 mb-1">
                هاتف: {storePhone}
              </div>
            )}

            <div className="my-2 border-b border-dashed border-slate-400"></div>

            {/* Meta */}
            <div className="flex justify-between items-center text-[11px] my-1">
              <span>فاتورة #: <strong>{invoice.number}</strong></span>
              <span className="text-[11px]">{invoice.time} {invoice.date}</span>
            </div>
            <div className="my-1 text-[11px]">
              العميل: <strong>{invoice.customer || 'عميل نقدي'}</strong> ({invoice.paymentType === 'credit' ? 'آجل' : 'نقدي'})
            </div>

            <div className="my-2 border-b border-dashed border-slate-400"></div>

            {/* Items List */}
            <div className="space-y-1.5 my-1">
              {invoice.items.length === 0 ? (
                <div className="text-center py-2 text-slate-400">لا توجد أصناف</div>
              ) : (
                invoice.items.map((item, idx) => {
                  const qty = parseArabicNumber(item.qty) || 1;
                  const total = parseArabicNumber(item.total);
                  const unitPrice = formatUnitPrice(qty > 0 ? total / qty : 0);
                  return (
                    <div key={idx} className="border-b border-dotted border-slate-300 pb-1">
                      <div className="font-bold text-[12px] text-slate-900">
                        {idx + 1}. {item.name || 'صنف'}
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
            <div className="flex justify-between items-center font-bold text-[13px] text-slate-950 my-1">
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
        <div className="p-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 space-y-2">
          {/* Row 1: Primary Thermal Print & Save PNG Image */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                sound.playTap();
                onPrint();
              }}
              className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة فورية</span>
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={downloadingImage}
              className="py-2.5 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
              title="حفظ الإيصال كصورة لطباعتها بأي تطبيق طابعة حرارية"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingImage ? 'جاري التوليد...' : 'حفظ كصورة (PNG)'}</span>
            </button>
          </div>

          {/* Row 2: Direct Bluetooth & Standalone Window */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                sound.playTap();
                if (onPrintBluetooth) onPrintBluetooth();
              }}
              className="py-2 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
            >
              <Bluetooth className="w-4 h-4" />
              <span>طابعة بلوتوث مباشرة</span>
            </button>

            <button
              onClick={handleOpenNewWindow}
              className="py-2 px-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
              title="فتح صفحة مستقلة للطباعة تضمن التوافق مع كافة أجهزة أندرويد"
            >
              <ExternalLink className="w-4 h-4" />
              <span>نافذة طباعة مستقلة</span>
            </button>
          </div>

          {/* Row 3: RawBT, Share Image, WhatsApp, Copy */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={handleRawBtApp}
              className="py-1.5 px-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
              title="إرسال لتطبيق RawBT"
            >
              <span>RawBT</span>
            </button>

            <button
              onClick={handleShareImage}
              className="py-1.5 px-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
              title="مشاركة صورة الإيصال"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>مشاركة</span>
            </button>

            <button
              onClick={() => {
                sound.playTap();
                onShareWhatsApp();
              }}
              className="py-1.5 px-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>واتساب</span>
            </button>

            <button
              onClick={handleCopy}
              className="py-1.5 px-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم!' : 'نسخ'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

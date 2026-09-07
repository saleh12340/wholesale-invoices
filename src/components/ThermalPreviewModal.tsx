import React from 'react';
import { X, Printer, Share2, Copy, Bluetooth } from 'lucide-react';
import { Invoice } from '../types';
import { formatNumber } from '../utils/arabic';
import { sound } from '../utils/audio';

interface ThermalPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  storeName: string;
  storeSubtitle: string;
  storePhone?: string;
  currency?: string;
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
  onPrint,
  onPrintBluetooth,
  onShareWhatsApp,
  onCopyText,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="thermal-preview-backdrop"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 no-print"
      onClick={onClose}
    >
      <div
        id="thermal-preview-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs">
            <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>معاينة إيصال الطباعة الحرارية</span>
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

        {/* Paper Receipt Simulation matching Screenshot 2 exactly */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950/60 flex justify-center">
          <div className="w-full max-w-[300px] bg-white text-slate-900 p-4 shadow-md font-mono text-xs border border-slate-300 relative select-text">
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

            <div className="my-1.5 border-b border-dashed border-slate-400"></div>

            {/* Meta matching Screenshot 2 */}
            <div className="flex justify-between items-center text-[11px] my-1">
              <span>فاتورة #: <strong>{invoice.number}</strong></span>
              <span className="text-[11px]">{invoice.time} {invoice.date}</span>
            </div>
            <div className="my-1 text-[11px]">
              العميل: <strong>{invoice.customer || 'عميل نقدي'}</strong> ({invoice.paymentType === 'credit' ? 'آجل' : 'نقدي'})
            </div>

            <div className="my-1.5 border-b border-dashed border-slate-400"></div>

            {/* Items List */}
            <div className="space-y-1.5 my-1">
              {invoice.items.length === 0 ? (
                <div className="text-center py-2 text-slate-400">لا توجد أصناف</div>
              ) : (
                invoice.items.map((item, idx) => {
                  const qty = item.qty || 1;
                  const unitPrice = qty > 0 ? (item.total / qty).toFixed(1) : '0';
                  return (
                    <div key={idx} className="border-b border-dotted border-slate-300 pb-1">
                      <div className="font-bold text-[12px] text-slate-900">
                        {idx + 1}. {item.name || 'صنف'}
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-700 mt-0.5">
                        <span>الكمية: {qty} × {unitPrice}</span>
                        <span className="font-bold text-slate-900">
                          {formatNumber(item.total)} {currency}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="my-1.5 border-b border-dashed border-slate-400"></div>

            {/* Totals matching Screenshot 2 */}
            <div className="flex justify-between items-center font-bold text-[13px] text-slate-950 my-1">
              <span>الإجمالي الكلي:</span>
              <span>{formatNumber(invoice.total)} {currency}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-700 my-1">
              <span>عدد الأصناف:</span>
              <span>{invoice.items.length}</span>
            </div>

            <div className="my-1.5 border-b border-dashed border-slate-400"></div>

            <div className="text-center text-[11px] text-slate-600 mt-2 leading-tight">
              شكراً لزيارتكم {storeName}<br />
              يرجى الاحتفاظ بالإيصال
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2">
          {/* Print Spooler */}
          <button
            onClick={() => {
              sound.playTap();
              onPrint();
            }}
            className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة حرارية (80mm)</span>
          </button>

          {/* Bluetooth ESC/POS Direct */}
          <button
            onClick={() => {
              sound.playTap();
              if (onPrintBluetooth) {
                onPrintBluetooth();
              } else {
                onPrint();
              }
            }}
            className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Bluetooth className="w-4 h-4" />
            <span>طابعة بلوتوث (RawBT)</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={() => {
              sound.playTap();
              onShareWhatsApp();
            }}
            className="py-2 px-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>واتساب</span>
          </button>

          {/* Copy Text */}
          <button
            onClick={() => {
              sound.playTap();
              onCopyText();
            }}
            className="py-2 px-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>نسخ النص</span>
          </button>
        </div>
      </div>
    </div>
  );
};

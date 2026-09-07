import React from 'react';
import { LogOut, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { sound } from '../utils/audio';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
  storeName?: string;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmExit,
  storeName = 'بقالة العزي',
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="exit-confirm-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none no-print"
      onClick={onClose}
    >
      <div
        id="exit-confirm-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-xs sm:max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4"
      >
        {/* App Logo & Store Brand */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border-2 border-emerald-500/40 p-0.5 bg-slate-900">
            <img
              src="/app-logo.jpg"
              alt={storeName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              تأكيد الخروج من التطبيق
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              {storeName} - كاشير الفواتير
            </p>
          </div>
        </div>

        {/* Informative Security Message */}
        <div className="bg-slate-50 dark:bg-slate-800/70 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-right space-y-2">
          <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              هل أنت متأكد من رغبتك في إغلاق التطبيق والخروج من جلسة العمل الحالية؟
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>تم حفظ جميع الفواتير والحسابات بأمان في ذاكرة جهازك.</span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            id="btn-confirm-exit-app"
            onClick={() => {
              sound.playTap();
              onConfirmExit();
            }}
            className="py-2.5 px-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>تأكيد الخروج</span>
          </button>

          <button
            id="btn-cancel-exit-app"
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition"
          >
            إلغاء والعودة
          </button>
        </div>
      </div>
    </div>
  );
};
